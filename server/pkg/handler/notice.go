package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

type noticeReq struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Open    bool   `json:"open"`
}

func (a *App) NoticeAdd(c *gin.Context) {
	var req noticeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	u := middleware.CurrentUser(c)
	n := models.Notice{Title: req.Title, Content: req.Content, Open: req.Open, Time: models.Now()}
	if u != nil {
		n.UserID = u.ID
	}
	if err := a.DB.Create(&n).Error; err != nil {
		core.Fail(c, "新增失败")
		return
	}
	middleware.SetOp(c, "公告", "新增")
	if u != nil {
		c.Set("honey_username", u.Username)
	}
	core.OK(c)
}

func (a *App) NoticeUpdate(c *gin.Context) {
	var n models.Notice
	if err := c.ShouldBindJSON(&n); err != nil || n.ID == 0 {
		core.Fail(c, "参数错误")
		return
	}
	if err := a.DB.Save(&n).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "公告", "修改")
	core.OK(c)
}

func (a *App) NoticeDelete(c *gin.Context) {
	a.DB.Delete(&models.Notice{}, parseID(c))
	middleware.SetOp(c, "公告", "删除")
	core.OK(c)
}

func (a *App) NoticeDeleteBatch(c *gin.Context) {
	a.DB.Delete(&models.Notice{}, ids(c))
	middleware.SetOp(c, "公告", "批量删除")
	core.OK(c)
}

func (a *App) NoticeSelectAll(c *gin.Context) {
	var list []models.Notice
	a.DB.Order("id desc").Find(&list)
	a.fillNotice(&list)
	core.OKData(c, list)
}

// NoticeSelectAllApp 公开的公告（移动端首页）
func (a *App) NoticeSelectAllApp(c *gin.Context) {
	var list []models.Notice
	a.DB.Where("open = ?", true).Order("id desc").Find(&list)
	a.fillNotice(&list)
	core.OKData(c, list)
}

func (a *App) NoticeSelectById(c *gin.Context) {
	var n models.Notice
	if err := a.DB.First(&n, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	a.fillNotice(&[]models.Notice{n})
	core.OKData(c, n)
}

func (a *App) NoticeSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Notice{})
	if v := c.Query("title"); v != "" {
		q = q.Where("title like ?", "%"+v+"%")
	}
	var list []models.Notice
	total := a.fillPage(c, q, nil, &list)
	a.fillNotice(&list)
	core.OKPage(c, list, total)
}

// NoticeSelectUserData App 首页公告栏（公开）
func (a *App) NoticeSelectUserData(c *gin.Context) {
	var list []models.Notice
	a.DB.Where("open = ?", true).Order("id desc").Find(&list)
	a.fillNotice(&list)
	core.OKData(c, list)
}

func (a *App) fillNotice(list *[]models.Notice) {
	if list == nil {
		return
	}
	for i := range *list {
		if (*list)[i].UserID > 0 {
			var u models.User
			if a.DB.Select("name").First(&u, (*list)[i].UserID).Error == nil {
				(*list)[i].User = u.Name
			}
		}
	}
}