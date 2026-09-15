package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

func (a *App) AddressAdd(c *gin.Context) {
	var addr models.Address
	if err := c.ShouldBindJSON(&addr); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	addr.UserID = uid(c)
	if err := a.DB.Create(&addr).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	middleware.SetOp(c, "地址", "新增")
	core.OK(c)
}

func (a *App) AddressUpdate(c *gin.Context) {
	var addr models.Address
	if err := c.ShouldBindJSON(&addr); err != nil || addr.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&addr).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "地址", "修改")
	core.OK(c)
}

func (a *App) AddressDelete(c *gin.Context) {
	id := parseID(c)
	if err := a.DB.Delete(&models.Address{}, id).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	middleware.SetOp(c, "地址", "删除")
	core.OK(c)
}

func (a *App) AddressDeleteBatch(c *gin.Context) {
	list := ids(c)
	if err := a.DB.Delete(&models.Address{}, list).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	middleware.SetOp(c, "地址", "批量删除")
	core.OK(c)
}

func (a *App) AddressSelectAll(c *gin.Context) {
	uidStr, _ := strconv.Atoi(c.Param("userId"))
	var list []models.Address
	if err := a.DB.Where("user_id = ?", uidStr).Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, list)
}

func (a *App) AddressSelectById(c *gin.Context) {
	var addr models.Address
	if err := a.DB.First(&addr, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, addr)
}

func (a *App) AddressSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Address{})
	if v := c.Query("address"); v != "" {
		q = q.Where("address like ?", "%"+v+"%")
	}
	var list []models.Address
	total := a.fillPage(c, q, nil, &list)
	core.OKPage(c, list, total)
}