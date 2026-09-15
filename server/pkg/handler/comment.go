package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

type commentReq struct {
	Star    float64 `json:"star"`
	Content string  `json:"content"`
	OrderID int     `json:"orderId"`
}

// CommentAdd 新增评论，同时更新订单 commentStatus=1
func (a *App) CommentAdd(c *gin.Context) {
	var req commentReq
	if err := c.ShouldBindJSON(&req); err != nil || req.OrderID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	u := middleware.CurrentUser(c)
	if u == nil {
		core.Fail(c, "请先登录")
		return
	}
	var ord models.Orders
	if err := a.DB.First(&ord, req.OrderID).Error; err != nil {
		core.Fail(c, "订单不存在")
		return
	}
	cm := models.Comment{
		Star: req.Star, Content: req.Content, Time: models.Now(),
		OrderID: req.OrderID, UID: ord.UID, BID: ord.BID,
	}
	if err := a.DB.Create(&cm).Error; err != nil {
		core.Fail(c, "评价失败")
		return
	}
	a.DB.Model(&models.Orders{}).Where("id = ?", req.OrderID).Update("comment_status", 1)
	middleware.SetOp(c, "评论", "新增")
	core.OK(c)
}

func (a *App) CommentUpdate(c *gin.Context) {
	var cm models.Comment
	if err := c.ShouldBindJSON(&cm); err != nil || cm.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&cm).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "评论", "修改")
	core.OK(c)
}

func (a *App) CommentDelete(c *gin.Context) {
	if err := a.DB.Delete(&models.Comment{}, parseID(c)).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	middleware.SetOp(c, "评论", "删除")
	core.OK(c)
}

func (a *App) CommentDeleteBatch(c *gin.Context) {
	if err := a.DB.Delete(&models.Comment{}, ids(c)).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	middleware.SetOp(c, "评论", "批量删除")
	core.OK(c)
}

func (a *App) CommentSelectAll(c *gin.Context) {
	var list []models.Comment
	if err := a.DB.Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, list)
}

func (a *App) CommentSelectAllByUid(c *gin.Context) {
	uidStr, _ := strconv.Atoi(c.Param("uid"))
	var list []models.Comment
	if err := a.DB.Where("uid = ?", uidStr).Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillComment(&list)
	core.OKData(c, list)
}

func (a *App) CommentSelectAllByBid(c *gin.Context) {
	bid, _ := strconv.Atoi(c.Param("bid"))
	var list []models.Comment
	if err := a.DB.Where("bid = ?", bid).Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillComment(&list)
	core.OKData(c, list)
}

func (a *App) CommentSelectById(c *gin.Context) {
	var cm models.Comment
	if err := a.DB.First(&cm, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillComment(&[]models.Comment{cm})
	core.OKData(c, cm)
}

func (a *App) CommentSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Comment{})
	var list []models.Comment
	total := a.fillPage(c, q, nil, &list)
	a.fillComment(&list)
	core.OKPage(c, list, total)
}

// fillComment 填充评论关联的商家与用户信息
func (a *App) fillComment(list *[]models.Comment) {
	if list == nil {
		return
	}
	for i := range *list {
		if (*list)[i].BID > 0 {
			var b models.Business
			if a.DB.Select("id, name, logo, introduce").First(&b, (*list)[i].BID).Error == nil {
				(*list)[i].Business = &b
			}
		}
		if (*list)[i].UID > 0 {
			var u models.User
			if a.DB.Select("id, name, avatar, username").First(&u, (*list)[i].UID).Error == nil {
				(*list)[i].User = &u
			}
		}
	}
}