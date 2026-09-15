package utils

import "github.com/shopspring/decimal"

// RealPrice 计算商品实际价：原价 × 0.7，保留两位小数。
func RealPrice(price float64) float64 {
	if price <= 0 {
		return 0
	}
	return decimal.NewFromFloat(price).Mul(decimal.NewFromFloat(0.7)).Round(2).InexactFloat64()
}

// CartLine 购物车金额计算行
type CartLine struct {
	Num  int
	Real float64
}

// CartAmount 计算购物车总金额
func CartAmount(items []CartLine) float64 {
	total := decimal.NewFromInt(0)
	for _, it := range items {
		total = total.Add(decimal.NewFromInt(int64(it.Num)).Mul(decimal.NewFromFloat(it.Real)))
	}
	return total.Round(2).InexactFloat64()
}