package utils

import (
	"math/rand"
	"sync"
	"time"

	"github.com/sony/sonyflake"
)

var (
	sfOnce sync.Once
	sf     *sonyflake.Sonyflake
)

// NextID 生成雪花订单号
func NextID() int64 {
	sfOnce.Do(func() {
		sf = sonyflake.NewSonyflake(sonyflake.Settings{
			StartTime: time.Date(2024, 1, 1, 0, 0, 0, 0, time.Local),
		})
		if sf == nil {
			sf = sonyflake.NewSonyflake(sonyflake.Settings{})
		}
	})
	if sf == nil {
		// 极端兜底：随机数
		return time.Now().UnixMilli()*1000 + int64(rand.Intn(1000))
	}
	id, err := sf.NextID()
	if err != nil {
		return time.Now().UnixMilli()
	}
	return int64(id)
}