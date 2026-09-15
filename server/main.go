package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/config"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/router"
)

func main() {
	cfg := config.Load("config.yaml")
	db := models.InitDB(cfg)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	router.Register(r, db, cfg)

	log.Printf("==> 后端服务已启动，监听端口 %s", cfg.Server.Port)
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}