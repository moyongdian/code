package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

// ProductAdd 新增商品：自动关联当前登录用户的商家，按分类名查询 cid
func (a *App) ProductAdd(c *gin.Context) {
	var p models.Product
	if err := c.ShouldBindJSON(&p); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if p.Name == "" {
		core.Fail(c, "商品名称不能为空")
		return
	}
	// 找当前用户的商家
	var b models.Business
	if err := a.DB.Where("uid = ?", uid(c)).First(&b).Error; err != nil {
		core.Fail(c, "未找到您的商家信息")
		return
	}
	p.BID = b.ID
	// 根据前端传来的 category（分类名）填充 cid
	if p.Category != "" {
		var cat models.Category
		if err := a.DB.Where("bid = ? AND name = ?", p.BID, p.Category).First(&cat).Error; err == nil {
			p.CID = cat.ID
		}
	}
	p.RealPrice = utils.RealPrice(p.Price)
	if err := a.DB.Create(&p).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	middleware.SetOp(c, "商品", "新增")
	core.OK(c)
}

func (a *App) ProductUpdate(c *gin.Context) {
	var p models.Product
	if err := c.ShouldBindJSON(&p); err != nil || p.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if p.Category != "" {
		var cat models.Category
		if err := a.DB.Where("name = ?", p.Category).First(&cat).Error; err == nil {
			p.CID = cat.ID
		}
	}
	if err := a.DB.Save(&p).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "商品", "修改")
	core.OK(c)
}

func (a *App) ProductDelete(c *gin.Context) {
	if err := a.DB.Delete(&models.Product{}, parseID(c)).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	middleware.SetOp(c, "商品", "删除")
	core.OK(c)
}

func (a *App) ProductDeleteBatch(c *gin.Context) {
	if err := a.DB.Delete(&models.Product{}, ids(c)).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	middleware.SetOp(c, "商品", "批量删除")
	core.OK(c)
}

func (a *App) ProductSelectAll(c *gin.Context) {
	var list []models.Product
	if err := a.DB.Order("id desc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillProduct(&list)
	core.OKData(c, list)
}

// ProductSelectAllByCid 按分类查询商品并计算 realPrice
func (a *App) ProductSelectAllByCid(c *gin.Context) {
	cid, _ := strconv.Atoi(c.Param("cid"))
	var list []models.Product
	if err := a.DB.Where("cid = ?", cid).Order("id asc").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillProduct(&list)
	core.OKData(c, list)
}

func (a *App) ProductSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Product{})
	if v := c.Query("name"); v != "" {
		q = q.Where("name like ?", "%"+v+"%")
	}
	if v := c.Query("bid"); v != "" {
		q = q.Where("bid = ?", v)
	}
	var list []models.Product
	total := a.fillPage(c, q, nil, &list)
	a.fillProduct(&list)
	core.OKPage(c, list, total)
}

// ProductSearchByApp 商品搜索（预留接口 /product/selectByApp）
func (a *App) ProductSearchByApp(c *gin.Context) {
	q := a.DB.Model(&models.Product{})
	if v := c.Query("name"); v != "" {
		q = q.Where("name like ?", "%"+v+"%")
	}
	var list []models.Product
	if err := q.Order("id desc").Limit(100).Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillProduct(&list)
	core.OKData(c, list)
}

// fillProduct 填充商品的商家/分类名称和 realPrice
func (a *App) fillProduct(list *[]models.Product) {
	if list == nil {
		return
	}
	bizCache := map[int]string{}
	catCache := map[int]string{}
	for i := range *list {
		(*list)[i].RealPrice = utils.RealPrice((*list)[i].Price)
		if (*list)[i].Business == "" {
			if name, ok := bizCache[(*list)[i].BID]; ok {
				(*list)[i].Business = name
			} else {
				var b models.Business
				if a.DB.Select("name").First(&b, (*list)[i].BID).Error == nil {
					bizCache[(*list)[i].BID] = b.Name
					(*list)[i].Business = b.Name
				}
			}
		}
		if (*list)[i].Category == "" {
			if name, ok := catCache[(*list)[i].CID]; ok {
				(*list)[i].Category = name
			} else {
				var cat models.Category
				if a.DB.Select("name").First(&cat, (*list)[i].CID).Error == nil {
					catCache[(*list)[i].CID] = cat.Name
					(*list)[i].Category = cat.Name
				}
			}
		}
	}
}