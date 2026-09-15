package handler

import (
	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/models"
)

// Charts 图表统计：订单销售趋势（按日期）、Top 商品销售、销售占比
func (a *App) Charts(c *gin.Context) {
	type kv struct {
		Name  string  `json:"name"`
		Value float64 `json:"value"`
		Date  string  `json:"date,omitempty"`
	}
	// line: 最近 30 天每日订单实付总额
	var line []kv
	a.DB.Model(&models.Orders{}).
		Select("substr(time,1,10) as date, coalesce(sum(actual),0) as value").
		Where("length(time) >= 10").
		Group("substr(time,1,10)").
		Order("substr(time,1,10) desc").
		Limit(30).
		Find(&line)
	// bar/pie: 按商品名称汇总销售额（Top）
	var bar []kv
	a.DB.Model(&models.Ordersitem{}).
		Select("product_name as name, coalesce(sum(price * num),0) as value").
		Group("product_name").
		Order("value desc").
		Limit(10).
		Find(&bar)
	core.OKData(c, gin.H{"line": line, "bar": bar, "pie": bar})
}

// Dashboard 经营概览卡片
func (a *App) Dashboard(c *gin.Context) {
	type stat struct {
		UserCount     int64   `json:"userCount"`
		BusinessCount int64   `json:"businessCount"`
		OrderCount    int64   `json:"orderCount"`
		TotalAmount   float64 `json:"totalAmount"`
		TodayOrders   int64   `json:"todayOrders"`
		TodayAmount   float64 `json:"todayAmount"`
	}
	var s stat
	a.DB.Model(&models.User{}).Count(&s.UserCount)
	a.DB.Model(&models.Business{}).Count(&s.BusinessCount)
	a.DB.Model(&models.Orders{}).Count(&s.OrderCount)
	a.DB.Model(&models.Orders{}).Select("coalesce(sum(actual),0)").Scan(&s.TotalAmount)
	today := models.Now()[:10] + "%"
	a.DB.Model(&models.Orders{}).Where("time like ?", today).Count(&s.TodayOrders)
	a.DB.Model(&models.Orders{}).Where("time like ?", today).Select("coalesce(sum(actual),0)").Scan(&s.TodayAmount)
	core.OKData(c, s)
}