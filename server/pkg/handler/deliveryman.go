package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

type deliveryReq struct {
	Name           string `json:"name"`
	Identification string `json:"identification"`
	StudentNumber  string `json:"studentNumber"`
	Phone          string `json:"phone"`
}

// DeliverymanAdd 实名认证（注册为骑手）
func (a *App) DeliverymanAdd(c *gin.Context) {
	var req deliveryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if len(req.Name) == 0 || len(req.Identification) != 18 || len(req.Phone) != 11 {
		core.Fail(c, "请填写真实姓名、18 位身份证号、11 位手机号")
		return
	}
	u := middleware.CurrentUser(c)
	if u == nil {
		core.Fail(c, "请先登录")
		return
	}
	var existing int64
	a.DB.Model(&models.Deliveryman{}).Where("user_id = ?", u.ID).Count(&existing)
	if existing > 0 {
		core.Fail(c, "您已完成实名认证")
		return
	}
	d := models.Deliveryman{
		UserID: u.ID, Name: req.Name, Identification: req.Identification,
		StudentNumber: req.StudentNumber, Phone: req.Phone, Time: models.Now(), Status: "通过",
	}
	if err := a.DB.Create(&d).Error; err != nil {
		core.Fail(c, "实名认证失败")
		return
	}
	a.DB.Model(&models.User{}).Where("id = ?", u.ID).Update("real_status", true)
	u.RealStatus = true
	middleware.SetOp(c, "骑手", "新增")
	c.Set("honey_username", u.Username)
	core.OKData(c, gin.H{"realStatus": true})
}

// DeliverymanSelectByPage 骑手管理列表
func (a *App) DeliverymanSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Deliveryman{})
	if v := c.Query("name"); v != "" {
		q = q.Where("name like ?", "%"+v+"%")
	}
	var list []models.Deliveryman
	total := a.fillPage(c, q, nil, &list)
	core.OKPage(c, list, total)
}

// OrderSelectTakeout 待接单订单列表（骑手端）
func (a *App) OrderSelectTakeout(c *gin.Context) {
	var list []models.Orders
	a.DB.Where("status IN ?", []string{"待发货", "待收货"}).Order("id desc").Limit(100).Find(&list)
	a.fillOrderBiz(&list)
	for i := range list {
		if list[i].AddressID > 0 {
			var addr models.Address
			if a.DB.First(&addr, list[i].AddressID).Error == nil {
				list[i].Address = &addr
			}
		}
	}
	core.OKData(c, list)
}