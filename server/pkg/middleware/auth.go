package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

const CtxUserKey = "current_user"

// JWTAuth JWT 鉴权中间件：token 缺省/无效/版本不符均返回 401。
func JWTAuth(db *gorm.DB, secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("token")
		if token == "" {
			token = c.Query("token")
		}
		if token == "" {
			c.AbortWithStatusJSON(http.StatusOK, gin.H{"code": 401, "msg": "请登录", "data": nil})
			return
		}
		claims, err := utils.ParseToken(token, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusOK, gin.H{"code": 401, "msg": "登录已失效，请重新登录", "data": nil})
			return
		}
		var user models.User
		if e := db.First(&user, claims.UserID).Error; e != nil {
			c.AbortWithStatusJSON(http.StatusOK, gin.H{"code": 401, "msg": "用户不存在", "data": nil})
			return
		}
		// 令牌版本校验：修改密码后旧 token 失效
		if claims.Version != user.TokenVersion {
			c.AbortWithStatusJSON(http.StatusOK, gin.H{"code": 401, "msg": "登录状态已过期，请重新登录", "data": nil})
			return
		}
		c.Set(strings.ToLower(CtxUserKey), &user)
		c.Next()
	}
}

// CurrentUser 从上下文取当前登录用户
func CurrentUser(c *gin.Context) *models.User {
	v, ok := c.Get(strings.ToLower(CtxUserKey))
	if !ok {
		return nil
	}
	if u, ok := v.(*models.User); ok {
		return u
	}
	return nil
}

// RequireRole 角色校验中间件（校验通过则继续）
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		u := CurrentUser(c)
		if u == nil {
			c.AbortWithStatusJSON(http.StatusOK, gin.H{"code": 401, "msg": "请登录", "data": nil})
			return
		}
		for _, r := range roles {
			if u.Role == r {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusOK, gin.H{"code": 500, "msg": "无权限访问", "data": nil})
	}
}