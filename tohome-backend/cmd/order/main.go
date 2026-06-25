// 订单服务
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/handler"
	"github.com/miaoda/backend/internal/middleware"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/internal/router"
	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/logger"
)

func main() {
	// 加载配置
	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		fmt.Printf("加载配置失败: %v\n", err)
		os.Exit(1)
	}

	// 初始化日志
	logger.Init(cfg.Log.Level, cfg.Log.Format, cfg.Log.Output, cfg.Log.FilePath)
	logger.Info("启动订单服务...")

	// 初始化数据库
	if err := database.InitPostgres(&cfg.Database); err != nil {
		logger.Fatal("初始化数据库失败: %v", err)
	}
	if err := database.InitRedis(&cfg.Redis); err != nil {
		logger.Fatal("初始化Redis失败: %v", err)
	}
	defer database.Close()

	// 初始化仓储层
	orderRepo := repository.NewOrderRepository(database.DB)
	userRepo := repository.NewUserRepository(database.DB, database.RedisClient)
	talentRepo := repository.NewTalentRepository(database.DB, database.RedisClient)
	svcRepo := repository.NewServiceRepository(database.DB)
	couponRepo := repository.NewCouponRepository(database.DB)

	// 初始化服务层
	orderService := service.NewOrderService(orderRepo, userRepo, talentRepo, svcRepo, couponRepo)

	// 初始化处理器
	orderHandler := handler.NewOrderHandler(orderService, talentRepo)

	// 设置Gin
	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	// CORS 由 Gateway 统一处理

	// 注册路由
	router.RegisterOrderRoutes(r, orderHandler, &cfg.JWT)

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 启动服务
	port := cfg.Services.Order
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info("订单服务监听端口: %d", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("服务启动失败: %v", err)
		}
	}()

	// 优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("正在关闭服务...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("服务关闭失败: %v", err)
	}
	logger.Info("服务已关闭")
}
