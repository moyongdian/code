package handler

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

// ============ orders 相关 ============

type addOrderDTO struct {
	BID         int    `json:"bid"`
	User        string `json:"user"`       // 收货人
	AddressID   int    `json:"addressId"`
	Phone       string `json:"phone"`
	Comment     string `json:"comment"`
	PayType     string `json:"payType"`
	BusinessName string `json:"businessName"` // 仅供参考
}

// OrderAddOrder 下单主流程（事务：购物车→订单+明细→清空购物车）
func (a *App) OrderAddOrder(c *gin.Context) {
	var dto addOrderDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	u := middleware.CurrentUser(c)
	if u == nil {
		core.Fail(c, "请先登录")
		return
	}
	// 查询购物车
	var carts []models.Cart
	if err := a.DB.Where("uid = ? AND bid = ?", u.ID, dto.BID).Find(&carts).Error; err != nil || len(carts) == 0 {
		core.Fail(c, "购物车为空")
		return
	}
	// 加载商品信息并计算金额
	type ciItem struct {
		Cart models.Cart
		Prod models.Product
	}
	var cis []ciItem
	amountDec := decimal.Zero
	for _, cart := range carts {
		var p models.Product
		if err := a.DB.First(&p, cart.PID).Error; err != nil {
			continue
		}
		cis = append(cis, ciItem{Cart: cart, Prod: p})
		amountDec = amountDec.Add(decimal.NewFromFloat(p.Price).Mul(decimal.NewFromFloat(float64(cart.Num))))
	}
	if len(cis) == 0 {
		core.Fail(c, "购物车为空")
		return
	}
	// actual = amount * 0.7
	actualDec := amountDec.Mul(decimal.NewFromFloat(0.7)).Round(2)
	amountDec = amountDec.Round(2)
	// 生成订单摘要
	firstName := cis[0].Prod.Name
	orderName := firstName + "等" + strconv.Itoa(len(cis)) + "件商品"
	// 订单号：雪花 ID
	orderNo := strconv.FormatInt(utils.NextID(), 10)
	// 在事务内创建（注意：直接在 DB 上开启，避免嵌套事务导致 SQLite 写锁泄漏）
	err := a.DB.Transaction(func(tx *gorm.DB) error {
		ord := models.Orders{
			OrderNo: orderNo, PayType: dto.PayType, Status: "待支付",
			BID: dto.BID, User: dto.User, Phone: dto.Phone, AddressID: dto.AddressID,
			UID: u.ID, Amount: amountDec.InexactFloat64(), Actual: actualDec.InexactFloat64(),
			Comment: dto.Comment, Cover: cis[0].Prod.Picture, Name: orderName, Time: models.Now(),
			CommentStatus: 0,
		}
		if err := tx.Create(&ord).Error; err != nil {
			return err
		}
		for _, ci := range cis {
			item := models.Ordersitem{
				OrderID:        ord.ID,
				Num:            ci.Cart.Num,
				Price:          ci.Prod.Price,
				ProductName:    ci.Prod.Name,
				ProductPicture: ci.Prod.Picture,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("uid = ? AND bid = ?", u.ID, dto.BID).Delete(&models.Cart{}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		core.Fail(c, "下单失败")
		return
	}
	middleware.SetOp(c, "订单", "新增")
	c.Set("honey_username", u.Username)
	core.OK(c)
}

// OrderAdd 简单新增订单（管理端直接创建）
func (a *App) OrderAdd(c *gin.Context) {
	var ord models.Orders
	if err := c.ShouldBindJSON(&ord); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	ord.Time = models.Now()
	if err := a.DB.Create(&ord).Error; err != nil {
		core.Fail(c, "创建失败")
		return
	}
	middleware.SetOp(c, "订单", "新增")
	core.OK(c)
}

// OrderUpdate 修改订单；若状态变更为"待发货"则记录支付时间（局部字段更新，不覆盖空值）
func (a *App) OrderUpdate(c *gin.Context) {
	var ord models.Orders
	if err := c.ShouldBindJSON(&ord); err != nil || ord.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	var old models.Orders
	if err := a.DB.First(&old, ord.ID).Error; err != nil {
		core.Fail(c, "订单不存在")
		return
	}
	updates := map[string]interface{}{}
	if ord.Status != "" {
		updates["status"] = ord.Status
		// 自动记录支付时间：从非"待发货"变为"待发货"视为支付动作
		if ord.Status == "待发货" && old.Status != "待发货" {
			updates["pay_time"] = models.Now()
		}
	}
	if ord.PayType != "" {
		updates["pay_type"] = ord.PayType
	}
	if ord.User != "" {
		updates["user"] = ord.User
	}
	if ord.Phone != "" {
		updates["phone"] = ord.Phone
	}
	if ord.AddressID != 0 {
		updates["address_id"] = ord.AddressID
	}
	if ord.Comment != "" {
		updates["comment"] = ord.Comment
	}
	// 骑手接单信息
	if ord.Did != 0 {
		updates["did"] = ord.Did
	}
	if ord.DeliverymanName != "" {
		updates["deliveryman_name"] = ord.DeliverymanName
	}
	if ord.DeliverymanPhone != "" {
		updates["deliveryman_phone"] = ord.DeliverymanPhone
	}
	if len(updates) == 0 {
		core.OK(c)
		return
	}
	if err := a.DB.Model(&models.Orders{}).Where("id = ?", ord.ID).Updates(updates).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "订单", "修改")
	core.OK(c)
}

func (a *App) OrderDelete(c *gin.Context) {
	if err := a.DB.Delete(&models.Orders{}, parseID(c)).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	middleware.SetOp(c, "订单", "删除")
	core.OK(c)
}

func (a *App) OrderDeleteBatch(c *gin.Context) {
	if err := a.DB.Delete(&models.Orders{}, ids(c)).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	middleware.SetOp(c, "订单", "批量删除")
	core.OK(c)
}

func (a *App) OrderSelectAll(c *gin.Context) {
	var list []models.Orders
	if err := a.DB.Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillOrderBiz(&list)
	core.OKData(c, list)
}

// OrderSelectByPage 订单分页查询（管理后台）
func (a *App) OrderSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Orders{})
	if v := c.Query("status"); v != "" {
		q = q.Where("status = ?", v)
	}
	if v := c.Query("orderNo"); v != "" {
		q = q.Where("order_no like ?", "%"+v+"%")
	}
	var list []models.Orders
	total := a.fillPage(c, q, nil, &list)
	a.fillOrderBiz(&list)
	core.OKPage(c, list, total)
}

// OrderSelectOrders 按用户+状态分组查询（移动端订单列表）
func (a *App) OrderSelectOrders(c *gin.Context) {
	uidStr, _ := strconv.Atoi(c.Param("uid"))
	status := c.Param("status")
	q := a.DB.Model(&models.Orders{}).Where("uid = ?", uidStr)
	switch strings.TrimSpace(status) {
	case "进行中":
		q = q.Where("status IN ?", []string{"待支付", "待发货", "待收货"})
	case "待评价":
		q = q.Where("status = ? AND comment_status = 0", "已完成")
	case "退款":
		q = q.Where("status = ?", "已退款")
	default:
		// 全部
	}
	var list []models.Orders
	if err := q.Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillOrderBiz(&list)
	core.OKData(c, list)
}

func (a *App) OrderSelectById(c *gin.Context) {
	var ord models.Orders
	if err := a.DB.First(&ord, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	if ord.BID > 0 {
		var b models.Business
		if a.DB.First(&b, ord.BID).Error == nil {
			ord.Business = &b
		}
	}
	if ord.AddressID > 0 {
		var addr models.Address
		if a.DB.First(&addr, ord.AddressID).Error == nil {
			ord.Address = &addr
		}
	}
	core.OKData(c, ord)
}

// fillOrderBiz 填充订单关联的商家信息
func (a *App) fillOrderBiz(list *[]models.Orders) {
	if list == nil {
		return
	}
	for i := range *list {
		if (*list)[i].BID > 0 && (*list)[i].Business == nil {
			var b models.Business
			if a.DB.First(&b, (*list)[i].BID).Error == nil {
				(*list)[i].Business = &b
			}
		}
	}
}

// ============ ordersitem 相关 ============

func (a *App) OrderItemAdd(c *gin.Context) {
	var it models.Ordersitem
	if err := c.ShouldBindJSON(&it); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Create(&it).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	core.OK(c)
}

func (a *App) OrderItemUpdate(c *gin.Context) {
	var it models.Ordersitem
	if err := c.ShouldBindJSON(&it); err != nil || it.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&it).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	core.OK(c)
}

func (a *App) OrderItemDelete(c *gin.Context) {
	if err := a.DB.Delete(&models.Ordersitem{}, parseID(c)).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	core.OK(c)
}

func (a *App) OrderItemDeleteBatch(c *gin.Context) {
	if err := a.DB.Delete(&models.Ordersitem{}, ids(c)).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	core.OK(c)
}

func (a *App) OrderItemSelectAll(c *gin.Context) {
	var list []models.Ordersitem
	if err := a.DB.Order("id").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillOrderItemPrice(&list)
	core.OKData(c, list)
}

func (a *App) OrderItemSelectByOrderId(c *gin.Context) {
	oid, _ := strconv.Atoi(c.Param("orderId"))
	var list []models.Ordersitem
	if err := a.DB.Where("order_id = ?", oid).Order("id").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillOrderItemPrice(&list)
	core.OKData(c, list)
}

func (a *App) OrderItemSelectById(c *gin.Context) {
	var it models.Ordersitem
	if err := a.DB.First(&it, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	it.RealPrice = utils.RealPrice(it.Price)
	core.OKData(c, it)
}

func (a *App) fillOrderItemPrice(list *[]models.Ordersitem) {
	for i := range *list {
		(*list)[i].RealPrice = utils.RealPrice((*list)[i].Price)
	}
}