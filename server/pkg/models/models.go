package models

import (
	"time"
)

// User 用户（管理员/用户/商家店主/骑手）
type User struct {
	ID           int     `gorm:"primaryKey;autoIncrement" json:"id"`
	Username     string  `gorm:"uniqueIndex" json:"username"`
	Password     string  `json:"password"`
	Name         string  `json:"name"`
	Phone        string  `json:"phone"`
	Email        string  `json:"email"`
	Address      string  `json:"address"`
	Avatar       string  `json:"avatar"`
	Role         string  `json:"role"` // 管理员 / 用户 / 商家
	Sex          int     `json:"sex"`
	RealStatus   bool    `gorm:"default:false" json:"realStatus"` // 是否实名认证（骑手）
	Token        string  `gorm:"-" json:"token"`
	TokenVersion int     `json:"-"` // JWT 令牌版本，改密后自增使旧 token 失效
}

// Business 商家
type Business struct {
	ID          int    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	Introduce   string `json:"introduce"`
	Logo        string `json:"logo"`
	Address     string `json:"address"`
	Status      string `json:"status"` // 通过 / 其它
	UID         int    `json:"uid"`
	Username    string `gorm:"-" json:"username"` // 店主姓名
	OpenStatus  int    `json:"openStatus"`        // 1营业 0打烊
	MinAmount   float64 `json:"minAmount"`        // 起送价
	OpenTime    string `json:"openTime"`
	CloseTime   string `json:"closeTime"`
	Score       float64 `json:"score"`  // 评分聚合
	Sales       int     `json:"sales"`  // 销量聚合
}

// Category 商品分类
type Category struct {
	ID    int    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name  string `json:"name"`
	BID   int    `gorm:"column:bid" json:"bid"`
	BName string `json:"bname"`
}

// Product 商品
type Product struct {
	ID          int     `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"` // 原价
	Sum         int     `json:"sum"`
	Picture     string  `json:"picture"`
	BID         int     `gorm:"column:bid" json:"bid"`
	CID         int     `gorm:"column:cid" json:"cid"`
	RealPrice   float64 `gorm:"-" json:"realPrice"` // 实际价 = price*0.7
	Business    string  `gorm:"-" json:"business"`  // 商家名
	Category    string  `gorm:"-" json:"category"`  // 分类名
}

// Cart 购物车
type Cart struct {
	ID       int       `gorm:"primaryKey;autoIncrement" json:"id"`
	PID      int       `gorm:"column:pid" json:"pid"`
	Num      int       `json:"num"`
	UID      int       `gorm:"column:uid" json:"uid"`
	BID      int       `gorm:"column:bid" json:"bid"`
	Product  *Product  `gorm:"-" json:"product"`
	Business *Business `gorm:"-" json:"business"`
}

// Orders 订单主表
type Orders struct {
	ID            int       `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderNo       string    `json:"orderNo"`
	PayType       string    `json:"payType"`
	PayTime       string    `json:"payTime"`
	Status        string    `json:"status"`
	BID           int       `gorm:"column:bid" json:"bid"`
	User          string    `json:"user"` // 收货人
	Phone         string    `json:"phone"`
	AddressID     int       `json:"addressId"`
	UID           int       `gorm:"column:uid" json:"uid"`
	Amount        float64   `json:"amount"`
	Actual        float64   `json:"actual"`
	Comment       string    `json:"comment"`
	Cover         string    `json:"cover"`
	Name          string    `json:"name"`
	Time          string    `json:"time"`
	CommentStatus int       `json:"commentStatus"` // 0未评 1已评
	Did           int       `json:"did"`           // 接单骑手用户 id
	DeliverymanName  string `json:"deliverymanName"`
	DeliverymanPhone string `json:"deliverymanPhone"`
	Business      *Business `gorm:"-" json:"business"`
	Address       *Address  `gorm:"-" json:"address"`
	PID           []int     `gorm:"-" json:"pid"`
}

// Ordersitem 订单明细
type Ordersitem struct {
	ID            int     `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID       int     `json:"orderId"`
	Num           int     `json:"num"`
	Price         float64 `json:"price"`
	ProductName   string  `json:"productName"`
	ProductPicture string `json:"productPicture"`
	RealPrice     float64 `gorm:"-" json:"realPrice"`
}

// Address 收货地址
type Address struct {
	ID      int    `gorm:"primaryKey;autoIncrement" json:"id"`
	Address string `json:"address"`
	User    string `json:"user"`
	Phone   string `json:"phone"`
	UserID  int    `json:"userId"`
}

// Comment 评论
type Comment struct {
	ID      int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Star    float64   `json:"star"`
	Content string    `json:"content"`
	Time    string    `json:"time"`
	OrderID int       `json:"orderId"`
	UID     int       `gorm:"column:uid" json:"uid"`
	BID     int       `gorm:"column:bid" json:"bid"`
	Business *Business `gorm:"-" json:"business"`
	User    *User     `gorm:"-" json:"user"`
}

// Collect 收藏
type Collect struct {
	ID           int       `gorm:"primaryKey;autoIncrement" json:"id"`
	BusinessName string    `json:"businessName"`
	BID          int       `gorm:"column:bid" json:"bid"`
	UID          int       `gorm:"column:uid" json:"uid"`
	Time         string    `json:"time"`
	IsCollect    int       `json:"isCollect"` // 1收藏 0取消
	Business     *Business `gorm:"-" json:"business"`
}

// Notice 公告
type Notice struct {
	ID      int    `gorm:"primaryKey;autoIncrement" json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"`
	UserID  int    `json:"userid"`
	Time    string `json:"time"`
	Open    bool   `json:"open"`
	User    string `gorm:"-" json:"user"`
}

// News 新闻
type News struct {
	ID          int    `gorm:"primaryKey;autoIncrement" json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Content     string `json:"content"`
	AuthorID    int    `json:"authorid"`
	Time        string `json:"time"`
	Author      string `gorm:"-" json:"author"`
}

// Logs 操作日志
type Logs struct {
	ID        int    `gorm:"primaryKey;autoIncrement" json:"id"`
	Operation string `json:"operation"` // 模块
	Type      string `json:"type"`      // 类型
	IP        string `json:"ip"`
	User      string `json:"user"` // 操作人
	Time      string `json:"time"`
}

// Banner 首页轮播图
type Banner struct {
	ID   int    `gorm:"primaryKey;autoIncrement" json:"id"`
	Img  string `json:"img"`
	Open bool   `json:"open"` // 是否上架
	Time string `json:"time"`
}

// Deliveryman 骑手（配送员）实名认证信息
type Deliveryman struct {
	ID             int    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         int    `json:"userId"`
	Name           string `json:"name"`
	Identification string `json:"identification"`
	StudentNumber  string `json:"studentNumber"`
	Phone          string `json:"phone"`
	Time           string `json:"time"`
	Status         string `json:"status"` // 通过 / 待审核
}

// TableName 指定表名
func (Orders) TableName() string     { return "orders" }
func (Ordersitem) TableName() string { return "ordersitem" }
func (Logs) TableName() string       { return "logs" }

var AllModels = []interface{}{
	&User{}, &Business{}, &Category{}, &Product{}, &Cart{},
	&Orders{}, &Ordersitem{}, &Address{}, &Comment{}, &Collect{},
	&Notice{}, &News{}, &Logs{}, &Banner{}, &Deliveryman{},
}

// Now 统一时间字符串格式
func Now() string {
	return time.Now().Format("2006-01-02 15:04:05")
}