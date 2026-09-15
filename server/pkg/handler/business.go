package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

// BusinessAdd 新增商家：状态默认通过、绑定当前登录用户
func (a *App) BusinessAdd(c *gin.Context) {
	var b models.Business
	if err := c.ShouldBindJSON(&b); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if b.Name == "" {
		core.Fail(c, "店铺名称不能为空")
		return
	}
	b.Status = "通过"
	b.UID = uid(c)
	if err := a.DB.Create(&b).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	middleware.SetOp(c, "商家", "新增")
	core.OK(c)
}

func (a *App) BusinessUpdate(c *gin.Context) {
	var b models.Business
	if err := c.ShouldBindJSON(&b); err != nil || b.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&b).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "商家", "修改")
	core.OK(c)
}

func (a *App) BusinessDelete(c *gin.Context) {
	if err := a.DB.Delete(&models.Business{}, parseID(c)).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	middleware.SetOp(c, "商家", "删除")
	core.OK(c)
}

func (a *App) BusinessDeleteBatch(c *gin.Context) {
	list := ids(c)
	if err := a.DB.Delete(&models.Business{}, list).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	middleware.SetOp(c, "商家", "批量删除")
	core.OK(c)
}

func (a *App) BusinessSelectAll(c *gin.Context) {
	var list []models.Business
	if err := a.DB.Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillBusinessNames(&list)
	core.OKData(c, list)
}

// BusinessSelectAllApp App 首页：仅审核通过的商家
func (a *App) BusinessSelectAllApp(c *gin.Context) {
	var list []models.Business
	if err := a.DB.Where("status = ?", "通过").Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, list)
}

func (a *App) BusinessSelectById(c *gin.Context) {
	var b models.Business
	if err := a.DB.First(&b, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillBusinessNames(&[]models.Business{b})
	core.OKData(c, b)
}

func (a *App) BusinessSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Business{})
	if v := c.Query("name"); v != "" {
		q = q.Where("name like ?", "%"+v+"%")
	}
	var list []models.Business
	total := a.fillPage(c, q, nil, &list)
	a.fillBusinessNames(&list)
	core.OKPage(c, list, total)
}

// fillBusinessNames 填充店主姓名
func (a *App) fillBusinessNames(list *[]models.Business) {
	if list == nil {
		return
	}
	for i := range *list {
		var u models.User
		if a.DB.First(&u, (*list)[i].UID).Error == nil {
			(*list)[i].Username = u.Name
		}
	}
}