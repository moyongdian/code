package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"xiaobaizuobishe-server/pkg/config"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

// App 持有全局 DB 与配置，业务方法挂载其上。
type App struct {
	DB  *gorm.DB
	Cfg *config.Config
}

// page 解析分页参数
func page(c *gin.Context) (int, int) {
	pn, _ := strconv.Atoi(c.DefaultQuery("pageNum", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if pn < 1 {
		pn = 1
	}
	if ps < 1 || ps > 100 {
		ps = 10
	}
	return pn, ps
}

// ids 解析批量删除 id 列表
func ids(c *gin.Context) []int {
	var list []int
	_ = c.ShouldBindJSON(&list)
	return list
}

// uid 当前登录用户 id
func uid(c *gin.Context) int {
	u := middleware.CurrentUser(c)
	if u == nil {
		return 0
	}
	return u.ID
}

// fillPage 执行分页查询（count + find），不返回响应，由调用方统一返回。
func (a *App) fillPage(c *gin.Context, q *gorm.DB, out interface{}, list interface{}) int64 {
	var total int64
	_ = q.Count(&total)
	pn, ps := page(c)
	_ = q.Offset((pn - 1) * ps).Limit(ps).Find(list)
	_ = out
	return total
}

// parseID 解析路径 id
func parseID(c *gin.Context) int {
	id, _ := strconv.Atoi(c.Param("id"))
	return id
}

// hashed 兼容：已 bcrypt 哈希则直接返回，否则加密
func hashed(pwd string) (string, error) {
	if pwd == "" || utils.IsHashed(pwd) {
		return pwd, nil
	}
	return utils.HashPassword(pwd)
}

// fillUser 拼接用户展示字段（商家店主姓名等）
func fillUser(u *models.User) {
	if u.Name == "" {
		u.Name = u.Username
	}
}