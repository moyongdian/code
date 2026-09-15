package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/utils"
)

// FileUpload 通用文件上传（公开）
func (a *App) FileUpload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		core.Fail(c, "请选择文件")
		return
	}
	if file.Size > a.Cfg.Upload.MaxSize*1024*1024 {
		core.Fail(c, "文件大小超过限制")
		return
	}
	url, err := utils.SaveFile(c, file, a.Cfg)
	if err != nil {
		core.Fail(c, err.Error())
		return
	}
	core.OKData(c, url)
}

// FileDownload 文件下载（附件方式，公开）
func (a *App) FileDownload(c *gin.Context) {
	name := c.Param("name")
	if strings.Contains(name, "..") {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	c.FileAttachment(utils.FilePath(a.Cfg, name), name)
}

// FileYulan 文件预览（内联，公开）
func (a *App) FileYulan(c *gin.Context) {
	name := c.Param("name")
	if strings.Contains(name, "..") {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	c.File(utils.FilePath(a.Cfg, name))
}

// FileEditorUpload 富文本编辑器上传（需登录）
func (a *App) FileEditorUpload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(200, gin.H{"errno": 1, "data": gin.H{"msg": "请选择文件"}})
		return
	}
	if file.Size > 10*1024*1024 {
		c.JSON(200, gin.H{"errno": 1, "data": gin.H{"msg": "文件过大"}})
		return
	}
	url, err := utils.SaveFile(c, file, a.Cfg)
	if err != nil {
		c.JSON(200, gin.H{"errno": 1, "data": gin.H{"msg": err.Error()}})
		return
	}
	// wangeditor 期望格式
	c.JSON(200, gin.H{"errno": 0, "data": gin.H{"url": url}})
}