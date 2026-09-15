package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

// Login 登录：用户名+密码，签发 JWT
func (a *App) Login(c *gin.Context) {
	var u models.User
	if err := c.ShouldBindJSON(&u); err != nil || u.Username == "" || u.Password == "" {
		core.Fail(c, "用户名和密码不能为空")
		return
	}
	var dbUser models.User
	if err := a.DB.Where("username = ?", u.Username).First(&dbUser).Error; err != nil {
		core.Fail(c, "用户名或密码错误")
		return
	}
	if !utils.VerifyPassword(dbUser.Password, u.Password) {
		core.Fail(c, "用户名或密码错误")
		return
	}
	token, err := utils.GenerateToken(dbUser.ID, dbUser.Role, dbUser.TokenVersion, a.Cfg.JWT.Secret, a.Cfg.JWT.ExpireHours)
	if err != nil {
		core.Fail(c, "登录令牌生成失败")
		return
	}
	dbUser.Token = token
	middleware.SetOp(c, "登录", "登录")
	c.Set("honey_username", dbUser.Username)
	core.OKData(c, dbUser)
}

// Register 管理后台注册
func (a *App) Register(c *gin.Context) {
	var u models.User
	if err := c.ShouldBindJSON(&u); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if len(u.Username) > 10 || len(u.Password) > 20 || u.Username == "" || u.Password == "" {
		core.Fail(c, "用户名或密码长度不合法")
		return
	}
	var count int64
	a.DB.Model(&models.User{}).Where("username = ?", u.Username).Count(&count)
	if count > 0 {
		core.Fail(c, "用户名已存在")
		return
	}
	pwd, err := utils.HashPassword(u.Password)
	if err != nil {
		core.Fail(c, "密码处理失败")
		return
	}
	if u.Role == "" {
		u.Role = "用户"
	}
	if u.Name == "" {
		u.Name = u.Username
	}
	u.Password = pwd
	u.TokenVersion = 1
	if err := a.DB.Create(&u).Error; err != nil {
		core.Fail(c, "注册失败")
		return
	}
	middleware.SetOp(c, "注册", "注册")
	c.Set("honey_username", u.Username)
	core.OK(c)
}

// AppRegister App 注册（强制角色为用户）
func (a *App) AppRegister(c *gin.Context) {
	var u models.User
	if err := c.ShouldBindJSON(&u); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if len(u.Username) > 10 || len(u.Password) > 20 || u.Username == "" || u.Password == "" {
		core.Fail(c, "用户名或密码长度不合法")
		return
	}
	var count int64
	a.DB.Model(&models.User{}).Where("username = ?", u.Username).Count(&count)
	if count > 0 {
		core.Fail(c, "用户名已存在")
		return
	}
	pwd, err := utils.HashPassword(u.Password)
	if err != nil {
		core.Fail(c, "密码处理失败")
		return
	}
	u.Role = "用户"
	u.Name = u.Username
	u.Password = pwd
	u.TokenVersion = 1
	if err := a.DB.Create(&u).Error; err != nil {
		core.Fail(c, "注册失败")
		return
	}
	middleware.SetOp(c, "注册", "注册")
	c.Set("honey_username", u.Username)
	core.OK(c)
}

// ResetPassword 忘记密码：用户名+手机号校验，重置为 123
func (a *App) ResetPassword(c *gin.Context) {
	var u models.User
	if err := c.ShouldBindJSON(&u); err != nil || u.Username == "" || u.Phone == "" {
		core.Fail(c, "请填写用户名和手机号")
		return
	}
	var dbUser models.User
	if err := a.DB.Where("username = ? AND phone = ?", u.Username, u.Phone).First(&dbUser).Error; err != nil {
		core.Fail(c, "用户名与手机号不匹配")
		return
	}
	pwd, _ := utils.HashPassword("123")
	dbUser.Password = pwd
	dbUser.TokenVersion++
	if err := a.DB.Save(&dbUser).Error; err != nil {
		core.Fail(c, "重置失败")
		return
	}
	middleware.SetOp(c, "用户", "修改")
	c.Set("honey_username", dbUser.Username)
	core.OK(c)
}