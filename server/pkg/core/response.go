package core

import (
	"reflect"

	"github.com/gin-gonic/gin"
)

// Result 统一响应体：{code, msg, data}
type Result struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

const (
	CodeSuccess = 200
	CodeUnauth  = 401
	CodeError   = 500
)

// ensureArray 将 nil 切片归一为空数组，避免前端拿到 null。
func ensureArray(v interface{}) interface{} {
	if v == nil {
		return nil
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return v
		}
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Slice && rv.IsNil() {
		return reflect.MakeSlice(rv.Type(), 0, 0).Interface()
	}
	return v
}

func OK(c *gin.Context) {
	c.JSON(200, Result{Code: CodeSuccess, Msg: "success"})
}

func OKData(c *gin.Context, data interface{}) {
	c.JSON(200, Result{Code: CodeSuccess, Msg: "success", Data: ensureArray(data)})
}

func Fail(c *gin.Context, msg string) {
	c.JSON(200, Result{Code: CodeError, Msg: msg})
}

func FailCode(c *gin.Context, code int, msg string) {
	c.JSON(200, Result{Code: code, Msg: msg})
}

// PageResult 分页结构
type PageResult struct {
	Records interface{} `json:"records"`
	Total   int64       `json:"total"`
}

func OKPage(c *gin.Context, records interface{}, total int64) {
	c.JSON(200, Result{Code: CodeSuccess, Msg: "success", Data: PageResult{Records: ensureArray(records), Total: total}})
}