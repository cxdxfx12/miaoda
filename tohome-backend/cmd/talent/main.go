// 达人服务
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
	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		fmt.Printf("加载配置失败: %v\n", err)
		os.Exit(1)
	}

	logger.Init(cfg.Log.Level, cfg.Log.Format, cfg.Log.Output, cfg.Log.FilePath)
	logger.Info("启动达人服务...")

	if err := database.InitPostgres(&cfg.Database); err != nil {
		logger.Fatal("初始化数据库失败: %v", err)
	}
	if err := database.InitRedis(&cfg.Redis); err != nil {
		logger.Fatal("初始化Redis失败: %v", err)
	}
	defer database.Close()

	talentRepo := repository.NewTalentRepository(database.DB, database.RedisClient)
	orderRepo := repository.NewOrderRepository(database.DB)
	talentService := service.NewTalentService(talentRepo, orderRepo)
	talentHandler := handler.NewTalentHandler(talentService)

	// 抢单池
	grabPoolService := service.NewGrabPoolService(orderRepo, talentRepo, database.RedisClient)
	grabPoolHandler := handler.NewGrabPoolHandler(grabPoolService, talentService)

	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	// CORS 由 Gateway 统一处理

	router.RegisterTalentRoutes(r, talentHandler, grabPoolHandler, &cfg.JWT)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	port := cfg.Services.Talent
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info("达人服务监听端口: %d", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("服务启动失败: %v", err)
		}
	}()

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
