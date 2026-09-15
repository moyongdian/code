package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

// BannersSelectAll 首页轮播图（公开）
func (a *App) BannersSelectAll(c *gin.Context) {
	var list []models.Banner
	a.DB.Where("open = ?", true).Order("id desc").Find(&list)
	core.OKData(c, list)
}

// BannerSelectAll 全量轮播图列表（管理后台）
func (a *App) BannerSelectAll(c *gin.Context) {
	var list []models.Banner
	a.DB.Order("id desc").Find(&list)
	core.OKData(c, list)
}

func (a *App) BannerAdd(c *gin.Context) {
	var b models.Banner
	if err := c.ShouldBindJSON(&b); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	b.Time = models.Now()
	if err := a.DB.Create(&b).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	middleware.SetOp(c, "轮播图", "新增")
	core.OK(c)
}

func (a *App) BannerUpdate(c *gin.Context) {
	var b models.Banner
	if err := c.ShouldBindJSON(&b); err != nil || b.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&b).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "轮播图", "修改")
	core.OK(c)
}

func (a *App) BannerDelete(c *gin.Context) {
	a.DB.Delete(&models.Banner{}, parseID(c))
	middleware.SetOp(c, "轮播图", "删除")
	core.OK(c)
}