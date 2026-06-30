// 用户服务
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
	if err := logger.Init(cfg.Log.Level, cfg.Log.Format, cfg.Log.Output, cfg.Log.FilePath); err != nil {
		fmt.Printf("初始化日志失败: %v\n", err)
		os.Exit(1)
	}
	logger.Info("启动用户服务...")

	// 初始化数据库
	if err := database.InitPostgres(&cfg.Database); err != nil {
		logger.Fatal("初始化数据库失败: %v", err)
	}
	defer database.Close()

	// 初始化Redis
	if err := database.InitRedis(&cfg.Redis); err != nil {
		logger.Fatal("初始化Redis失败: %v", err)
	}

	// 初始化仓储层
	userRepo := repository.NewUserRepository(database.DB, database.RedisClient)
	addressRepo := repository.NewAddressRepository(database.DB)
	talentRepo := repository.NewTalentRepository(database.DB, database.RedisClient)
	orderRepo := repository.NewOrderRepository(database.DB)
	svcRepo := repository.NewServiceRepository(database.DB)

	// 初始化全局 Redis（供 service 层使用）
	service.InitGlobalRedis(database.RedisClient)

	// 初始化服务层
	userService := service.NewUserService(userRepo, addressRepo, cfg)
	userService.SetTalentRepo(talentRepo) // 用于登录时判断用户是否为达人
	talentService := service.NewTalentService(talentRepo, orderRepo)
	svcService := service.NewServiceService(svcRepo)
	wechatService := service.NewWechatService(cfg, userRepo)

	// 第三方服务
	mapService := service.NewMapService(cfg, talentRepo)
	notifService := service.NewNotificationService(database.DB, database.RedisClient, cfg)
	virtualPhoneService := service.NewVirtualPhoneService(database.DB, database.RedisClient, cfg)

	// 初始化处理器
	userHandler := handler.NewUserHandler(userService)
	talentHandler := handler.NewTalentHandler(talentService)
	serviceHandler := handler.NewServiceHandler(svcService)
	mapHandler := handler.NewMapHandler(mapService)
	notifHandler := handler.NewNotificationHandler(notifService)
	virtualPhoneHandler := handler.NewVirtualPhoneHandler(virtualPhoneService)
	wechatHandler := handler.NewWechatHandler(wechatService)

	// 管理后台处理器（orderSvc 传 nil，当前 admin handler 未使用）
	adminHandler := handler.NewAdminHandler(userService, nil, talentService)

	// 设置Gin
	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()

	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	// CORS 由 Gateway 统一处理
	r.Use(loggerMiddleware())

	// 注册路由
	router.RegisterUserRoutes(r, userHandler, talentHandler, &cfg.JWT)
	router.RegisterServiceRoutes(r, serviceHandler)
	router.RegisterWechatRoutes(r, wechatHandler, &cfg.JWT)
	router.RegisterPublicBannerRoutes(r, adminHandler)
	router.RegisterAdminRoutes(r, adminHandler, nil, &cfg.JWT)
	router.RegisterMapRoutes(r, mapHandler, &cfg.JWT)
	router.RegisterNotificationRoutes(r, notifHandler, &cfg.JWT)
	router.RegisterVirtualPhoneRoutes(r, virtualPhoneHandler, &cfg.JWT)

	// 静态文件服务（上传目录）
	r.Static("/uploads", "./public/uploads")

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().Unix(),
		})
	})

	// 启动服务
	port := cfg.Services.User
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info("用户服务监听端口: %d", port)
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

// loggerMiddleware 日志中间件
func loggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()

		if raw != "" {
			path = path + "?" + raw
		}

		logger.Info("[GIN] %v |%3d| %13v | %15s | %-7s %s | %s",
			start.Format("2006/01/02 - 15:04:05"),
			statusCode,
			latency,
			clientIP,
			method,
			path,
			errorMessage,
		)
	}
}
