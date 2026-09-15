package router

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"xiaobaizuobishe-server/pkg/config"
	"xiaobaizuobishe-server/pkg/handler"
	"xiaobaizuobishe-server/pkg/middleware"
)

// Register 注册所有路由。
func Register(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	r.Use(gin.Logger(), middleware.Recovery(), middleware.CORS(), middleware.OperationLog(db))
	if cfg.Upload.Dir != "" {
		r.Static("files", cfg.Upload.Dir)
	}

	app := &handler.App{DB: db, Cfg: cfg}

	// ========== 公开接口（免登录） ==========
	pub := r.Group("")
	{
		// 服务信息 / 健康检查
		pub.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"name":    "校园外卖点餐平台-后端服务",
				"version": "1.0.0",
				"docs": gin.H{
					"登录":     "POST /login",
					"首页商家列表": "GET /business/selectAllApp",
					"轮播图":    "GET /banners/selectAll",
					"健康检查":   "GET /health",
				},
				"status": "running",
			})
		})
		pub.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 200, "msg": "ok", "data": gin.H{"status": "up"}})
		})
		pub.POST("/login", app.Login)
		pub.POST("/register", app.Register)
		pub.POST("/appRegister", app.AppRegister)
		pub.PUT("/password", app.ResetPassword)
		pub.POST("/file/upload", app.FileUpload)
		pub.GET("/file/download/:name", app.FileDownload)
		pub.GET("/file/yulan/:name", app.FileYulan)
		pub.GET("/banners/selectAll", app.BannersSelectAll)
		// 移动端浏览类公开数据
		pub.GET("/business/selectAllApp", app.BusinessSelectAllApp)
		pub.GET("/business/selectById/:id", app.BusinessSelectById)
		pub.GET("/product/selectByApp", app.ProductSearchByApp)
		pub.GET("/notice/selectAllApp", app.NoticeSelectAllApp)
		pub.GET("/notice/selectUserData", app.NoticeSelectUserData)
		pub.GET("/news/selectNewsData", app.NewsSelectNewsData)
		pub.GET("/comment/selectAllByBid/:bid", app.CommentSelectAllByBid)
	}

	// ========== 需登录接口 ==========
	auth := r.Group("", middleware.JWTAuth(db, cfg.JWT.Secret))
	{
		// 用户
		auth.POST("/user/add", app.UserAdd)
		auth.PUT("/user/update", app.UserUpdate)
		auth.DELETE("/user/delete/:id", app.UserDelete)
		auth.DELETE("/user/delete/batch", app.UserDeleteBatch)
		auth.GET("/user/selectAll", app.UserSelectAll)
		auth.GET("/user/selectById/:id", app.UserSelectById)
		auth.GET("/user/selectByPage", app.UserSelectByPage)
		auth.GET("/user/export", app.UserExport)
		auth.POST("/user/import", app.UserImport)
		auth.PUT("/user/updatePassword", app.UpdatePassword)

		// 管理员
		auth.POST("/admin/add", app.AdminAdd)
		auth.PUT("/admin/update", app.AdminUpdate)
		auth.DELETE("/admin/delete/:id", app.AdminDelete)
		auth.DELETE("/admin/delete/batch", app.AdminDeleteBatch)
		auth.GET("/admin/selectAll", app.AdminSelectAll)
		auth.GET("/admin/selectById/:id", app.AdminSelectById)
		auth.GET("/admin/selectByPage", app.AdminSelectByPage)
		auth.GET("/admin/export", app.AdminExport)
		auth.POST("/admin/import", app.AdminImport)

		// 商家
		auth.POST("/business/add", app.BusinessAdd)
		auth.PUT("/business/update", app.BusinessUpdate)
		auth.DELETE("/business/delete/:id", app.BusinessDelete)
		auth.DELETE("/business/delete/batch", app.BusinessDeleteBatch)
		auth.GET("/business/selectAll", app.BusinessSelectAll)
		auth.GET("/business/selectByPage", app.BusinessSelectByPage)

		// 分类
		auth.POST("/category/add", app.CategoryAdd)
		auth.PUT("/category/update", app.CategoryUpdate)
		auth.DELETE("/category/delete/:id", app.CategoryDelete)
		auth.DELETE("/category/delete/batch", app.CategoryDeleteBatch)
		auth.GET("/category/selectAll", app.CategorySelectAll)
		auth.GET("/category/selectAllByBid/:bid", app.CategorySelectAllByBid)
		auth.GET("/category/selectById/:id", app.CategorySelectById)
		auth.GET("/category/selectByPage", app.CategorySelectByPage)

		// 商品
		auth.POST("/product/add", app.ProductAdd)
		auth.PUT("/product/update", app.ProductUpdate)
		auth.DELETE("/product/delete/:id", app.ProductDelete)
		auth.DELETE("/product/delete/batch", app.ProductDeleteBatch)
		auth.GET("/product/selectAll", app.ProductSelectAll)
		auth.GET("/product/selectAllByCid/:cid", app.ProductSelectAllByCid)
		auth.GET("/product/selectByPage", app.ProductSelectByPage)

		// 购物车
		auth.GET("/cart/calc", app.CartCalc)
		auth.POST("/cart/add", app.CartAdd)
		auth.PUT("/cart/update", app.CartUpdate)
		auth.DELETE("/cart/delete/:id", app.CartDelete)
		auth.DELETE("/cart/deleteByBid/:bid/:uid", app.CartDeleteByBid)
		auth.DELETE("/cart/delete/batch", app.CartDeleteBatch)
		auth.GET("/cart/selectAll/:bid/:uid", app.CartSelectAll)
		auth.GET("/cart/selectAllApp", app.CartSelectAllApp)

		// 订单
		auth.POST("/orders/addOrder", app.OrderAddOrder)
		auth.POST("/orders/add", app.OrderAdd)
		auth.PUT("/orders/update", app.OrderUpdate)
		auth.DELETE("/orders/delete/:id", app.OrderDelete)
		auth.DELETE("/orders/delete/batch", app.OrderDeleteBatch)
		auth.GET("/orders/selectAll", app.OrderSelectAll)
		auth.GET("/orders/selectByPage", app.OrderSelectByPage)
		auth.GET("/orders/selectOrders/:uid/:status", app.OrderSelectOrders)
		auth.GET("/orders/selectById/:id", app.OrderSelectById)
		auth.GET("/orders/selectTakeout", app.OrderSelectTakeout)

		// 订单明细
		auth.POST("/orderItem/add", app.OrderItemAdd)
		auth.PUT("/orderItem/update", app.OrderItemUpdate)
		auth.DELETE("/orderItem/delete/:id", app.OrderItemDelete)
		auth.DELETE("/orderItem/delete/batch", app.OrderItemDeleteBatch)
		auth.GET("/orderItem/selectAll", app.OrderItemSelectAll)
		auth.GET("/orderItem/selectByOrderId/:orderId/*rest", app.OrderItemSelectByOrderId)
		auth.GET("/orderItem/selectById/:id", app.OrderItemSelectById)

		// 地址
		auth.POST("/address/add", app.AddressAdd)
		auth.PUT("/address/update", app.AddressUpdate)
		auth.DELETE("/address/delete/:id", app.AddressDelete)
		auth.DELETE("/address/delete/batch", app.AddressDeleteBatch)
		auth.GET("/address/selectAll/:userId", app.AddressSelectAll)
		auth.GET("/address/selectById/:id", app.AddressSelectById)
		auth.GET("/address/selectByPage", app.AddressSelectByPage)

		// 评论
		auth.POST("/comment/add", app.CommentAdd)
		auth.PUT("/comment/update", app.CommentUpdate)
		auth.DELETE("/comment/delete/:id", app.CommentDelete)
		auth.DELETE("/comment/delete/batch", app.CommentDeleteBatch)
		auth.GET("/comment/selectAll", app.CommentSelectAll)
		auth.GET("/comment/selectAllByUid/:uid", app.CommentSelectAllByUid)
		auth.GET("/comment/selectById/:id", app.CommentSelectById)
		auth.GET("/comment/selectByPage", app.CommentSelectByPage)

		// 收藏
		auth.POST("/collect/add", app.CollectAdd)
		auth.PUT("/collect/update", app.CollectUpdate)
		auth.DELETE("/collect/delete/:id", app.CollectDelete)
		auth.DELETE("/collect/delete/batch", app.CollectDeleteBatch)
		auth.GET("/collect/selectAll", app.CollectSelectAll)
		auth.GET("/collect/selectByUid/:uid", app.CollectSelectByUid)
		auth.GET("/collect/selectByUidBid/:uid/:bid", app.CollectSelectByUidBid)
		auth.GET("/collect/selectByPage", app.CollectSelectByPage)

		// 公告
		auth.POST("/notice/add", app.NoticeAdd)
		auth.PUT("/notice/update", app.NoticeUpdate)
		auth.DELETE("/notice/delete/:id", app.NoticeDelete)
		auth.DELETE("/notice/delete/batch", app.NoticeDeleteBatch)
		auth.GET("/notice/selectAll", app.NoticeSelectAll)
		auth.GET("/notice/selectById/:id", app.NoticeSelectById)
		auth.GET("/notice/selectByPage", app.NoticeSelectByPage)

		// 新闻
		auth.POST("/news/add", app.NewsAdd)
		auth.PUT("/news/update", app.NewsUpdate)
		auth.DELETE("/news/delete/:id", app.NewsDelete)
		auth.DELETE("/news/delete/batch", app.NewsDeleteBatch)
		auth.GET("/news/selectAll", app.NewsSelectAll)
		auth.GET("/news/selectById/:id", app.NewsSelectById)
		auth.GET("/news/selectByPage", app.NewsSelectByPage)

		// 日志
		auth.DELETE("/logs/delete/:id", app.LogDelete)
		auth.DELETE("/logs/delete/batch", app.LogDeleteBatch)
		auth.GET("/logs/selectByPage", app.LogSelectByPage)

		// 统计
		auth.GET("/charts", app.Charts)
		auth.GET("/dashboard", app.Dashboard)

		// 骑手
		auth.POST("/deliveryman/add", app.DeliverymanAdd)
		auth.GET("/deliveryman/selectByPage", app.DeliverymanSelectByPage)

		// 轮播图管理
		auth.GET("/banner/selectAll", app.BannerSelectAll)
		auth.POST("/banner/add", app.BannerAdd)
		auth.PUT("/banner/update", app.BannerUpdate)
		auth.DELETE("/banner/delete/:id", app.BannerDelete)

		// 富文本编辑器文件上传
		auth.POST("/file/editor/upload", app.FileEditorUpload)
	}
}
