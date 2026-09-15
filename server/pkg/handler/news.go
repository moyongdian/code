package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

type newsReq struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Content     string `json:"content"`
}

func (a *App) NewsAdd(c *gin.Context) {
	var req newsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	u := middleware.CurrentUser(c)
	n := models.News{Title: req.Title, Description: req.Description, Content: req.Content, Time: models.Now()}
	if u != nil {
		n.AuthorID = u.ID
	}
	if err := a.DB.Create(&n).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	middleware.SetOp(c, "新闻", "新增")
	if u != nil {
		c.Set("honey_username", u.Username)
	}
	core.OK(c)
}

func (a *App) NewsUpdate(c *gin.Context) {
	var n models.News
	if err := c.ShouldBindJSON(&n); err != nil || n.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&n).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "新闻", "修改")
	core.OK(c)
}

func (a *App) NewsDelete(c *gin.Context) {
	a.DB.Delete(&models.News{}, parseID(c))
	middleware.SetOp(c, "新闻", "删除")
	core.OK(c)
}

func (a *App) NewsDeleteBatch(c *gin.Context) {
	a.DB.Delete(&models.News{}, ids(c))
	middleware.SetOp(c, "新闻", "批量删除")
	core.OK(c)
}

func (a *App) NewsSelectAll(c *gin.Context) {
	var list []models.News
	a.DB.Order("id desc").Find(&list)
	a.fillNews(&list)
	core.OKData(c, list)
}

func (a *App) NewsSelectById(c *gin.Context) {
	var n models.News
	if err := a.DB.First(&n, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillNews(&[]models.News{n})
	core.OKData(c, n)
}

// NewsSelectNewsData 首页最新两条
func (a *App) NewsSelectNewsData(c *gin.Context) {
	var list []models.News
	a.DB.Order("id desc").Limit(2).Find(&list)
	a.fillNews(&list)
	core.OKData(c, list)
}

func (a *App) NewsSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.News{})
	if v := c.Query("title"); v != "" {
		q = q.Where("title like ?", "%"+v+"%")
	}
	var list []models.News
	total := a.fillPage(c, q, nil, &list)
	a.fillNews(&list)
	core.OKPage(c, list, total)
}

func (a *App) fillNews(list *[]models.News) {
	if list == nil {
		return
	}
	for i := range *list {
		if (*list)[i].AuthorID > 0 {
			var u models.User
			if a.DB.Select("name").First(&u, (*list)[i].AuthorID).Error == nil {
				(*list)[i].Author = u.Name
			}
		}
	}
}