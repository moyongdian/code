package middleware

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

const (
	OpKey  = "honey_op"   // 操作模块
	TypeKey = "honey_type" // 操作类型
)

// SetOp 在 handler 中标记本次操作（模块、类型），由 OperationLog 中间件落库。
func SetOp(c *gin.Context, operation, opType string) {
	c.Set(OpKey, operation)
	c.Set(TypeKey, opType)
}

// OperationLog 操作日志中间件：handler 执行成功后异步写入 logs 表。
func OperationLog(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		op, _ := c.Get(OpKey)
		typ, _ := c.Get(TypeKey)
		if op == nil && typ == nil {
			return
		}
		if c.Writer.Status() >= 400 {
			return
		}
		userName := ""
		if u := CurrentUser(c); u != nil {
			userName = u.Username
		}
		if userName == "" {
			if v, ok := c.Get("honey_username"); ok {
				userName = v.(string)
			}
		}
		ip := utils.GetClientIP(c)
		module := ""
		if op != nil {
			module = op.(string)
		}
		opType := ""
		if typ != nil {
			opType = typ.(string)
		}
		go func() {
			db.Create(&models.Logs{
				Operation: module,
				Type:      opType,
				IP:        ip,
				User:      userName,
				Time:      models.Now(),
			})
		}()
	}
}