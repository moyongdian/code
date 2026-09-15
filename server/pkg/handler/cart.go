package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

type cartReq struct {
	ID int `json:"id"`
	PID int `json:"pid"`
	Num int `json:"num"`
	UID int `json:"uid"`
	BID int `json:"bid"`
}

// CartCalc 计算购物车总金额
func (a *App) CartCalc(c *gin.Context) {
	uidStr := c.Query("uid")
	bidStr := c.Query("bid")
	uidV, _ := strconv.Atoi(uidStr)
	bidV, _ := strconv.Atoi(bidStr)
	var items []models.Cart
	if err := a.DB.Where("uid = ? AND bid = ?", uidV, bidV).Find(&items).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	list := []utils.CartLine{}
	for _, ci := range items {
		var p models.Product
		if a.DB.First(&p, ci.PID).Error == nil {
			list = append(list, utils.CartLine{Num: ci.Num, Real: utils.RealPrice(p.Price)})
		}
	}
	amount := utils.CartAmount(list)
	core.OKData(c, amount)
}

// CartAdd 加购：同商品同商家数量累加
func (a *App) CartAdd(c *gin.Context) {
	var req cartReq
	if err := c.ShouldBindJSON(&req); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if req.PID <= 0 || req.BID <= 0 {
		core.Fail(c, "商品或商家信息错误")
		return
	}
	u := middleware.CurrentUser(c)
	if u == nil {
		core.Fail(c, "请先登录")
		return
	}
	req.UID = u.ID
	var old models.Cart
	if err := a.DB.Where("pid = ? AND uid = ? AND bid = ?", req.PID, req.UID, req.BID).First(&old).Error; err == nil {
		old.Num += req.Num
		a.DB.Save(&old)
	} else {
		cart := models.Cart{PID: req.PID, Num: req.Num, UID: req.UID, BID: req.BID}
		a.DB.Create(&cart)
	}
	core.OK(c)
}

// CartUpdate 修改购物车数量
func (a *App) CartUpdate(c *gin.Context) {
	var req cartReq
	if err := c.ShouldBindJSON(&req); err != nil || req.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Model(&models.Cart{}).Where("id = ?", req.ID).Update("num", req.Num).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	core.OK(c)
}

func (a *App) CartDelete(c *gin.Context) {
	id := parseID(c)
	if err := a.DB.Delete(&models.Cart{}, id).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	core.OK(c)
}

func (a *App) CartDeleteByBid(c *gin.Context) {
	bid, _ := strconv.Atoi(c.Param("bid"))
	uidStr, _ := strconv.Atoi(c.Param("uid"))
	if err := a.DB.Where("bid = ? AND uid = ?", bid, uidStr).Delete(&models.Cart{}).Error; err != nil {
		core.Fail(c, "清空购物车失败")
		return
	}
	core.OK(c)
}

func (a *App) CartDeleteBatch(c *gin.Context) {
	if err := a.DB.Delete(&models.Cart{}, ids(c)).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	core.OK(c)
}

// CartSelectAll 查询指定用户在指定商家的购物车
func (a *App) CartSelectAll(c *gin.Context) {
	bid, _ := strconv.Atoi(c.Param("bid"))
	uidStr, _ := strconv.Atoi(c.Param("uid"))
	var list []models.Cart
	if err := a.DB.Where("bid = ? AND uid = ?", bid, uidStr).Order("id asc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillCart(&list)
	core.OKData(c, list)
}

// CartSelectAllApp 当前登录用户的购物车
func (a *App) CartSelectAllApp(c *gin.Context) {
	u := middleware.CurrentUser(c)
	if u == nil {
		core.Fail(c, "请先登录")
		return
	}
	var list []models.Cart
	if err := a.DB.Where("uid = ?", u.ID).Order("id asc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillCart(&list)
	core.OKData(c, list)
}

// fillCart 填充购物车商品与商家信息
func (a *App) fillCart(list *[]models.Cart) {
	if list == nil {
		return
	}
	for i := range *list {
		var p models.Product
		if a.DB.First(&p, (*list)[i].PID).Error == nil {
			p.RealPrice = utils.RealPrice(p.Price)
			(*list)[i].Product = &p
		}
		var b models.Business
		if a.DB.First(&b, (*list)[i].BID).Error == nil {
			(*list)[i].Business = &b
		}
	}
}