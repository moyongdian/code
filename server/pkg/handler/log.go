package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

func (a *App) LogDelete(c *gin.Context) {
	a.DB.Delete(&models.Logs{}, parseID(c))
	middleware.SetOp(c, "日志", "删除")
	core.OK(c)
}

func (a *App) LogDeleteBatch(c *gin.Context) {
	a.DB.Delete(&models.Logs{}, ids(c))
	middleware.SetOp(c, "日志", "批量删除")
	core.OK(c)
}

func (a *App) LogSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Logs{})
	if v := c.Query("operation"); v != "" {
		q = q.Where("operation like ?", "%"+v+"%")
	}
	if v := c.Query("type"); v != "" {
		q = q.Where("type = ?", v)
	}
	if v := c.Query("user"); v != "" {
		q = q.Where("user like ?", "%"+v+"%")
	}
	var list []models.Logs
	total := a.fillPage(c, q, nil, &list)
	core.OKPage(c, list, total)
}