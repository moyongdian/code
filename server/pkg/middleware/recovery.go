package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
)

// Recovery panic 兜底，返回统一错误体
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				c.AbortWithStatusJSON(http.StatusOK, core.Result{Code: core.CodeError, Msg: "系统内部错误", Data: nil})
			}
		}()
		c.Next()
	}
}