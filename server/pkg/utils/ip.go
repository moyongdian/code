package utils

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// GetClientIP 获取客户端真实 IP（支持多级代理头）
func GetClientIP(c *gin.Context) string {
	for _, key := range []string{"x-forwarded-for", "proxy-client-ip", "x-real-ip"} {
		if v := c.GetHeader(key); v != "" {
			parts := strings.Split(v, ",")
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return normalizeIP(ip)
			}
		}
	}
	return normalizeIP(c.ClientIP())
}

func normalizeIP(ip string) string {
	if ip == "0:0:0:0:0:0:0:1" {
		return "127.0.0.1"
	}
	return ip
}