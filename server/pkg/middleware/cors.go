package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS 全局跨域中间件
func CORS() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "token"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: false,
		MaxAge:           86400,
	})
}