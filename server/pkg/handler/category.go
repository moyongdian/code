package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

// CategoryAdd 新增分类，自动关联当前登录用户的商家
func (a *App) CategoryAdd(c *gin.Context) {
	var cat models.Category
	if err := c.ShouldBindJSON(&cat); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if cat.Name == "" {
		core.Fail(c, "分类名称不能为空")
		return
	}
	// 查当前用户的商家（按 uid 匹配 business.uid）
	var b models.Business
	if err := a.DB.Where("uid = ?", uid(c)).First(&b).Error; err != nil {
		core.Fail(c, "未找到您的商家信息")
		return
	}
	cat.BID = b.ID
	cat.BName = b.Name
	if err := a.DB.Create(&cat).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	middleware.SetOp(c, "分类", "新增")
	core.OK(c)
}

func (a *App) CategoryUpdate(c *gin.Context) {
	var cat models.Category
	if err := c.ShouldBindJSON(&cat); err != nil || cat.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&cat).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "分类", "修改")
	core.OK(c)
}

func (a *App) CategoryDelete(c *gin.Context) {
	if err := a.DB.Delete(&models.Category{}, parseID(c)).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	middleware.SetOp(c, "分类", "删除")
	core.OK(c)
}

func (a *App) CategoryDeleteBatch(c *gin.Context) {
	if err := a.DB.Delete(&models.Category{}, ids(c)).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	middleware.SetOp(c, "分类", "批量删除")
	core.OK(c)
}

func (a *App) CategorySelectAll(c *gin.Context) {
	var list []models.Category
	if err := a.DB.Order("id asc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, list)
}

func (a *App) CategorySelectAllByBid(c *gin.Context) {
	bid, _ := strconv.Atoi(c.Param("bid"))
	var list []models.Category
	if err := a.DB.Where("bid = ?", bid).Order("id asc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, list)
}

func (a *App) CategorySelectById(c *gin.Context) {
	var cat models.Category
	if err := a.DB.First(&cat, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, cat)
}

func (a *App) CategorySelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Category{})
	if v := c.Query("name"); v != "" {
		q = q.Where("name like ?", "%"+v+"%")
	}
	var list []models.Category
	total := a.fillPage(c, q, nil, &list)
	_ = total
	core.OKPage(c, list, total)
}

// fillCategoryNames 批量填充 BName（可能重复查询同一 bid，数据量小可接受）
func (a *App) fillCategoryNames(list *[]models.Category) {
	if list == nil {
		return
	}
	for i := range *list {
		var b models.Business
		if (*list)[i].BName == "" && a.DB.First(&b, (*list)[i].BID).Error == nil {
			(*list)[i].BName = b.Name
		}
	}
}

// 实际填充从 db 层使用预加载会更高效，此处为简单实现
var _ gorm.DB // 显式引用以消除可能的 unused
