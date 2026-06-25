// API网关服务
package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/middleware"
	"github.com/miaoda/backend/pkg/logger"
)

func main() {
	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		fmt.Printf("加载配置失败: %v\n", err)
		os.Exit(1)
	}

	logger.Init(cfg.Log.Level, cfg.Log.Format, cfg.Log.Output, cfg.Log.FilePath)
	logger.Info("启动API网关...")

	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.CORS())

	// 服务路由配置（有序，更具体的路径在前）
	type routeConfig struct {
		prefix string
		target string
	}
	routes := []routeConfig{
		// 静态文件代理（上传的图片）→ user-service
		{"/uploads/", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		// 达人端订单路由 → order-service
		{"/api/v1/talent/orders/", fmt.Sprintf("http://%s:%d", cfg.Services.OrderHost, cfg.Services.Order)},
		// 管理后台 - 具体子路由要放在通用 /api/v1/admin/ 之前
		{"/api/v1/admin/orders", fmt.Sprintf("http://%s:%d", cfg.Services.OrderHost, cfg.Services.Order)},
		{"/api/v1/admin/dispatch", fmt.Sprintf("http://%s:%d", cfg.Services.DispatchHost, cfg.Services.Dispatch)},
		// 通用路由
		{"/api/v1/auth/", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		{"/api/v1/user/", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		{"/api/v1/services", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		{"/api/v1/services/", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		{"/api/v1/orders", fmt.Sprintf("http://%s:%d", cfg.Services.OrderHost, cfg.Services.Order)},
		{"/api/v1/orders/", fmt.Sprintf("http://%s:%d", cfg.Services.OrderHost, cfg.Services.Order)},
		{"/api/v1/talents/", fmt.Sprintf("http://%s:%d", cfg.Services.TalentHost, cfg.Services.Talent)},
		{"/api/v1/payments/", fmt.Sprintf("http://%s:%d", cfg.Services.PaymentHost, cfg.Services.Payment)},
		{"/api/v1/banners", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		{"/api/v1/config/support", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		{"/api/v1/config/billing-rules", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
		// 其他 admin 请求（talents/users/finance/reviews/marketing/config/settings/analytics）→ user-service
		{"/api/v1/admin/", fmt.Sprintf("http://%s:%d", cfg.Services.UserHost, cfg.Services.User)},
	}

	// 统一 NoRoute 代理，保留完整路径传给下游
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		for _, rc := range routes {
			if strings.HasPrefix(path, rc.prefix) {
				targetURL, _ := url.Parse(rc.target)
				proxy := httputil.NewSingleHostReverseProxy(targetURL)
				// 清除下游服务重复的CORS头，由Gateway统一设置
				proxy.ModifyResponse = func(resp *http.Response) error {
					resp.Header.Del("Access-Control-Allow-Origin")
					resp.Header.Del("Access-Control-Allow-Methods")
					resp.Header.Del("Access-Control-Allow-Headers")
					resp.Header.Del("Access-Control-Expose-Headers")
					resp.Header.Del("Access-Control-Max-Age")
					return nil
				}
				proxy.ServeHTTP(c.Writer, c.Request)
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{
			"code":    1004,
			"message": "Route not found",
		})
	})

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().Unix(),
		})
	})

	port := cfg.Services.Gateway
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	go func() {
		logger.Info("API网关监听端口: %d", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("网关启动失败: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("正在关闭网关...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("网关关闭失败: %v", err)
	}
	logger.Info("网关已关闭")
}
