package models

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"xiaobaizuobishe-server/pkg/config"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDB 初始化数据库连接（sqlite 开箱即用 / mysql 可切换）并自动建表、写入种子数据。
func InitDB(cfg *config.Config) *gorm.DB {
	dsn := cfg.Database.DSN
	if dsn == "" {
		dsn = "./data/honey2024.db"
	}
	var dialector gorm.Dialector
	switch cfg.Database.Driver {
	case "mysql":
		dialector = mysql.Open(dsn)
	default:
		dir := filepath.Dir(dsn)
		if dir != "." && dir != "" {
			if err := os.MkdirAll(dir, 0755); err != nil {
				log.Printf("创建数据目录失败: %v", err)
			}
		}
		// 追加 SQLite 运行时参数：忙等待 10s、WAL 日志模式，降低并发写锁概率
		if !strings.Contains(dsn, "?") {
			dsn += "?_pragma=busy_timeout(10000)&_pragma=journal_mode(WAL)"
		}
		dialector = sqlite.Open(dsn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	if err := db.AutoMigrate(AllModels...); err != nil {
		log.Fatalf("自动建表失败: %v", err)
	}

	seed(db)
	return db
}

// seed 写入初始账号数据。
func seed(db *gorm.DB) {
	var count int64
	db.Model(&User{}).Count(&count)
	if count > 0 {
		return
	}

	adminPwd, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	userPwd, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	users := []User{
		{Username: "admin", Password: string(adminPwd), Name: "系统管理员", Role: "管理员", TokenVersion: 1},
		{Username: "test", Password: string(userPwd), Name: "测试用户", Phone: "13800001111", Role: "用户", Sex: 1, TokenVersion: 1},
		{Username: "shop", Password: string(userPwd), Name: "商家店主", Phone: "13800002222", Role: "用户", TokenVersion: 1},
	}
	if err := db.Create(&users).Error; err != nil {
		log.Printf("写入种子用户失败: %v", err)
	}

	shopUser := User{}
	db.Where("username = ?", "shop").First(&shopUser)
	business := Business{
		Name:      "湘味小炒 · 校园食堂",
		Phone:     "0731-88886666",
		Introduce: "新鲜现炒，30 分钟极速送达，学生党最爱！",
		Logo:      "",
		Address:   "校园东区食堂一楼",
		Status:    "通过",
		UID:       shopUser.ID,
		OpenStatus: 1,
		MinAmount:  10,
		OpenTime:   "10:00",
		CloseTime:  "22:00",
		Score:      4.5,
	}
	if err := db.Create(&business).Error; err != nil {
		log.Printf("写入种子商家失败: %v", err)
	}

	cats := []Category{
		{Name: "主食", BID: business.ID, BName: business.Name},
		{Name: "饮品", BID: business.ID, BName: business.Name},
	}
	if err := db.Create(&cats).Error; err != nil {
		log.Printf("写入种子分类失败: %v", err)
	}

	prods := []Product{
		{Name: "现炒黄焖鸡米饭", Description: "香辣黄焖鸡 + 米饭", Price: 18, Sum: 100, Picture: "", BID: business.ID, CID: cats[0].ID},
		{Name: "经典奶茶", Description: "招牌港式奶茶", Price: 10, Sum: 200, Picture: "", BID: business.ID, CID: cats[1].ID},
	}
	if err := db.Create(&prods).Error; err != nil {
		log.Printf("写入种子商品失败: %v", err)
	}

	notices := []Notice{
		{Title: "欢迎使用校园外卖平台", Content: "<p>本平台为校园师生提供便捷的外卖点餐服务，祝您用餐愉快！</p>", UserID: users[0].ID, Time: Now(), Open: true},
	}
	if err := db.Create(&notices).Error; err != nil {
		log.Printf("写入种子公告失败: %v", err)
	}

	fmt.Println("==> 种子数据初始化完成：admin/admin123（管理员）、test/123456（用户）、shop/123456（商家店主）")
	db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)})
	_ = db
}