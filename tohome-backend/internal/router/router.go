// Package router 路由注册
package router

import (
	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/handler"
	"github.com/miaoda/backend/internal/middleware"
)

// RegisterUserRoutes 注册用户服务路由
func RegisterUserRoutes(r *gin.Engine, h *handler.UserHandler, talH *handler.TalentHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	// 公开接口
	public := api.Group("/auth")
	{
		public.POST("/sms/send", h.SendSmsCode)
		public.POST("/login", h.Login)
		public.POST("/refresh", h.RefreshToken)
		public.POST("/tech/login", h.TalentLogin)
		public.POST("/tech/logout", h.TechLogout)
	}

	// 达人入驻图片上传：允许未登录先上传图片，提交申请时再校验登录
	api.POST("/user/talent/upload", talH.UploadTalentFile)

	// 需要用户认证
	user := api.Group("/user")
	user.Use(middleware.UserAuth(jwtCfg))
	{
		user.GET("/info", h.GetUserInfo)
		user.PUT("/info", h.UpdateUserInfo)
		user.PUT("/password", h.UpdatePassword)
		user.POST("/logout", h.Logout)

		// 地址管理
		user.GET("/addresses", h.ListAddresses)
		user.POST("/addresses", h.CreateAddress)
		user.PUT("/addresses/:id", h.UpdateAddress)
		user.DELETE("/addresses/:id", h.DeleteAddress)
		user.PUT("/addresses/:id/default", h.SetDefaultAddress)

		// 达人入驻申请
		user.POST("/talent/apply", talH.ApplyTalent)
	}
}

// RegisterOrderRoutes 注册订单服务路由
func RegisterOrderRoutes(r *gin.Engine, h *handler.OrderHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	// 需要用户认证
	user := api.Group("/orders")
	user.Use(middleware.UserAuth(jwtCfg))
	{
		user.POST("", h.CreateOrder)
		user.GET("", h.ListOrders)
		user.GET("/:id", h.GetOrderDetail)
		user.POST("/:id/cancel", h.CancelOrder)
		user.POST("/:id/pay", h.PayOrder)
		user.POST("/:id/review", h.ReviewOrder)
		user.POST("/:id/extra-time", h.RequestExtraTime)
	}

	// 达人认证
	talent := api.Group("/talent/orders")
	talent.Use(middleware.TalentAuth(jwtCfg))
	{
		talent.GET("/pending", h.GetPendingOrders)
		talent.GET("/current", h.GetCurrentOrder)
		talent.POST("/:id/accept", h.AcceptOrder)
		talent.POST("/:id/reject", h.RejectOrder)
		talent.POST("/:id/status", h.UpdateOrderStatus)
		talent.POST("/:id/location", h.UpdateLocation)
	}

	// 管理员认证
	admin := api.Group("/admin/orders")
	admin.Use(middleware.AdminAuth(jwtCfg))
	{
		admin.GET("", h.AdminListOrders)
		admin.GET("/:id", h.AdminGetOrderDetail)
		admin.POST("/:id/assign", h.AdminAssignOrder)
	}
}

// RegisterTalentRoutes 注册达人服务路由
func RegisterTalentRoutes(r *gin.Engine, h *handler.TalentHandler, grabH *handler.GrabPoolHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	// 公开接口
	public := api.Group("/talents")
	{
		public.GET("/nearby", h.GetNearbyTalents)
		public.GET("/:id", h.GetTalentDetail)
		public.GET("/:id/reviews", h.GetTalentReviews)
	}

	// 达人认证
	talent := api.Group("/talent")
	talent.Use(middleware.TalentAuth(jwtCfg))
	{
		talent.GET("/profile", h.GetProfile)
		talent.PUT("/profile", h.UpdateProfile)
		talent.POST("/status", h.UpdateWorkStatus)
		talent.POST("/location", h.UpdateLocation)
		talent.GET("/income/statistics", h.GetIncomeStatistics)
		talent.GET("/income/records", h.GetIncomeRecords)
		talent.POST("/income/withdraw", h.RequestWithdraw)
		talent.GET("/dashboard", h.GetDashboard)

		// 抢单池
		talent.GET("/grab-pool/list", grabH.ListPoolOrders)
		talent.POST("/grab-pool/:order_id/grab", grabH.GrabOrder)
		talent.GET("/grab-pool/stats", grabH.GetGrabStats)
	}
}

// RegisterServiceRoutes 注册服务路由
func RegisterServiceRoutes(r *gin.Engine, h *handler.ServiceHandler) {
	api := r.Group("/api/v1")

	public := api.Group("/services")
	{
		public.GET("/categories", h.ListCategories)
		public.GET("", h.ListServices)
		public.GET("/:id", h.GetServiceDetail)
	}
}

// RegisterPaymentRoutes 注册支付服务路由
func RegisterPaymentRoutes(r *gin.Engine, h *handler.PaymentHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	user := api.Group("/payments")
	user.Use(middleware.UserAuth(jwtCfg))
	{
		user.POST("/create", h.CreatePayment)
		user.GET("/:id", h.GetPayment)
		user.POST("/:payment_no/simulate-success", h.SimulatePaymentSuccess)
	}

	// 支付回调（无需认证）
	api.POST("/payments/callback/wechat", h.WechatCallback)
	api.POST("/payments/callback/alipay", h.AlipayCallback)
}

// RegisterDispatchRoutes 注册调度服务路由
func RegisterDispatchRoutes(r *gin.Engine, h *handler.DispatchHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	admin := api.Group("/admin/dispatch")
	admin.Use(middleware.AdminAuth(jwtCfg))
	{
		admin.GET("/pending", h.GetPendingOrders)
		admin.GET("/available-talents/:order_id", h.GetAvailableTalents)
		admin.POST("/assign", h.ManualAssign)
		admin.POST("/auto", h.AutoDispatch)
		admin.GET("/stats", h.GetDispatchStats)
	}
}

// RegisterMapRoutes 注册地图服务路由
func RegisterMapRoutes(r *gin.Engine, h *handler.MapHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	mapGroup := api.Group("/map")
	mapGroup.Use(middleware.UserAuth(jwtCfg))
	{
		mapGroup.GET("/geocode", h.Geocode)
		mapGroup.GET("/reverse-geocode", h.ReverseGeocode)
		mapGroup.GET("/distance", h.Distance)
		mapGroup.GET("/search", h.Search)
	}
}

// RegisterVirtualPhoneRoutes 注册虚拟电话路由
func RegisterVirtualPhoneRoutes(r *gin.Engine, h *handler.VirtualPhoneHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	phone := api.Group("/phone")
	phone.Use(middleware.UserAuth(jwtCfg))
	{
		phone.POST("/bind", h.BindPhone)
		phone.DELETE("/unbind", h.UnbindPhone)
	}
	// 通话录音回调（无需认证）
	api.POST("/phone/callback/recording", h.RecordingCallback)

	// 管理后台 - 虚拟电话配置测试连接
	admin := api.Group("/admin")
	admin.Use(middleware.AdminAuth(jwtCfg))
	{
		admin.POST("/config/phone/test", h.TestConnection)
	}
}

// RegisterNotificationRoutes 注册通知路由
func RegisterNotificationRoutes(r *gin.Engine, h *handler.NotificationHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	notif := api.Group("/notification")
	notif.Use(middleware.UserAuth(jwtCfg))
	{
		notif.POST("/send", h.SendNotification)
		notif.GET("/list", h.ListNotifications)
		notif.PUT("/read/:id", h.MarkAsRead)
		notif.PUT("/read-all", h.MarkAllAsRead)
	}
}

// RegisterWechatRoutes 注册微信OAuth路由
func RegisterWechatRoutes(r *gin.Engine, h *handler.WechatHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	// 公开接口
	public := api.Group("/auth/wechat")
	{
		public.GET("/config", h.GetWechatConfig)
		public.POST("/login", h.WechatLogin)
		public.GET("/callback", h.WechatCallback)
	}

	// 需要登录
	user := api.Group("/user/wechat")
	user.Use(middleware.UserAuth(jwtCfg))
	{
		user.POST("/bind-phone", h.WechatBindPhone)
	}
}

// RegisterPublicBannerRoutes 注册公开轮播图路由（无需认证）
func RegisterPublicBannerRoutes(r *gin.Engine, h *handler.AdminHandler) {
	api := r.Group("/api/v1")
	api.GET("/banners", h.PublicListBanners)
	api.GET("/config/support", h.PublicGetSupportConfig)
	api.GET("/config/site", h.PublicGetSiteConfig)
	api.GET("/config/billing-rules", h.PublicGetBillingRules)
}

// RegisterAdminRoutes 注册管理后台路由
func RegisterAdminRoutes(r *gin.Engine, h *handler.AdminHandler, grabH *handler.GrabPoolHandler, jwtCfg *config.JWTConfig) {
	api := r.Group("/api/v1")

	// 管理员登录（无需认证）
	api.POST("/admin/auth/login", h.AdminLogin)

	// 管理员认证路由
	admin := api.Group("/admin")
	admin.Use(middleware.AdminAuth(jwtCfg))
	{
		// 仪表盘
		admin.GET("/profile", h.AdminGetProfile)
		admin.PUT("/profile", h.AdminUpdateProfile)
		admin.POST("/profile/password", h.AdminChangePassword)
		admin.GET("/dashboard", h.GetDashboard)
		admin.GET("/stats", h.GetStats)

		// 达人管理
		admin.GET("/talents", h.AdminListTalents)
		admin.GET("/talents/:id", h.AdminGetTalentDetail)
		admin.POST("/talents", h.AdminCreateTalent)
		admin.PUT("/talents/:id", h.AdminUpdateTalent)
		admin.POST("/talents/:id/review", h.AdminReviewTalent)
		admin.POST("/talents/batch-review", h.AdminBatchReviewTalents)

		// 文件上传
		admin.POST("/upload", h.AdminUploadFile)

		// 用户管理
		admin.GET("/users", h.AdminListUsers)
		admin.GET("/users/:id", h.AdminGetUserDetail)
		admin.POST("/users", h.AdminCreateUser)
		admin.PUT("/users/:id", h.AdminUpdateUser)
		admin.DELETE("/users/:id", h.AdminDeleteUser)
		admin.POST("/users/:id/disable", h.AdminDisableUser)
		admin.POST("/users/:id/enable", h.AdminEnableUser)

		// 财务管理
		admin.GET("/finance/overview", h.AdminFinanceOverview)
		admin.GET("/finance/trend", h.AdminRevenueAnalytics)
		admin.GET("/finance/transactions", h.AdminFinanceTransactions)
		admin.GET("/finance/transactions/export", h.AdminExportTransactions)
		admin.GET("/finance/export", h.AdminExportTransactions)

		// 评价管理
		admin.GET("/reviews", h.AdminListReviews)
		admin.GET("/reviews/overview", h.AdminGetReviewsOverview)
		admin.POST("/reviews/:id/reply", h.AdminReplyReview)

		// 营销管理
		admin.GET("/marketing/overview", h.AdminGetMarketingOverview)
		admin.GET("/marketing/activities", h.AdminListActivities)
		admin.POST("/marketing/activities", h.AdminCreateActivity)
		admin.GET("/marketing/coupons", h.AdminListCoupons)
		admin.POST("/marketing/coupons", h.AdminCreateCoupon)
		admin.POST("/marketing/coupons/:id/send", h.AdminSendCoupon)

		// 轮播图管理
		admin.GET("/marketing/banners", h.AdminListBanners)
		admin.POST("/marketing/banners", h.AdminSaveBanner)
		admin.PUT("/marketing/banners/:id", h.AdminUpdateBanner)
		admin.DELETE("/marketing/banners/:id", h.AdminDeleteBanner)

		// 配置管理
		admin.GET("/config/:group", h.AdminGetConfig)
		admin.PUT("/config/:group", h.AdminUpdateConfig)
		admin.POST("/config/:group", h.AdminBatchUpdateConfig)

		// 系统设置（兼容前端 settings API 路径）
		settingsAdmin := admin.Group("/settings")
		{
			settingsAdmin.GET("/basic", h.AdminGetConfigSetting("basic"))
			settingsAdmin.POST("/basic", h.AdminUpdateConfigSetting("basic"))
			settingsAdmin.GET("/site", h.AdminGetConfigSetting("site"))
			settingsAdmin.POST("/site", h.AdminUpdateConfigSetting("site"))
			settingsAdmin.GET("/notify", h.AdminGetConfigSetting("notify"))
			settingsAdmin.POST("/notify", h.AdminUpdateConfigSetting("notify"))
			settingsAdmin.GET("/security", h.AdminGetConfigSetting("security"))
			settingsAdmin.POST("/security", h.AdminUpdateConfigSetting("security"))
			settingsAdmin.GET("/support", h.AdminGetConfigSetting("support"))
			settingsAdmin.POST("/support", h.AdminUpdateConfigSetting("support"))
			settingsAdmin.GET("/commission", h.AdminGetConfigSetting("commission"))
			settingsAdmin.POST("/commission", h.AdminUpdateConfigSetting("commission"))
			settingsAdmin.GET("/travel_fee", h.AdminGetConfigSetting("travel_fee"))
			settingsAdmin.POST("/travel_fee", h.AdminUpdateConfigSetting("travel_fee"))
			settingsAdmin.GET("/wecom", h.AdminGetConfigSetting("wecom"))
			settingsAdmin.POST("/wecom", h.AdminUpdateConfigSetting("wecom"))
			settingsAdmin.POST("/wecom/test", h.AdminTestWeComNotification)
			settingsAdmin.GET("/backups", h.AdminListBackups)
			settingsAdmin.POST("/backups", h.AdminBackup)
			settingsAdmin.GET("/backups/:filename/download", h.AdminDownloadBackup)
			settingsAdmin.POST("/backups/:filename/restore", h.AdminRestoreBackup)
			settingsAdmin.DELETE("/backups/:filename", h.AdminDeleteBackup)
			settingsAdmin.GET("/server-status", h.AdminGetServiceStatus)
		}

		// 服务分类管理（管理后台）
		admin.GET("/services/categories", h.AdminListServiceCategories)
		admin.POST("/services/categories", h.AdminSaveServiceCategory)
		admin.PUT("/services/categories/:id", h.AdminUpdateServiceCategory)
		admin.DELETE("/services/categories/:id", h.AdminDeleteServiceCategory)

		// 服务项目管理（管理后台）
		admin.GET("/services", h.AdminListServices)
		admin.POST("/services", h.AdminSaveService)
		admin.GET("/services/:id", h.AdminGetServiceDetail)
		admin.PUT("/services/:id", h.AdminUpdateService)
		admin.DELETE("/services/:id", h.AdminDeleteService)

		// 服务监控
		admin.GET("/services/status", h.AdminGetServiceStatus)
		admin.POST("/backup", h.AdminBackup)

		// 数据分析
		admin.GET("/analytics/revenue", h.AdminRevenueAnalytics)
		admin.GET("/analytics/users", h.AdminUserAnalytics)
		admin.GET("/analytics/cities", h.AdminCityAnalytics)

		// 抢单池管理（需要 GrabPoolHandler）
		if grabH != nil {
			admin.GET("/grab-pool/overview", grabH.AdminPoolOverview)
			admin.POST("/grab-pool/remove", grabH.AdminRemoveFromPool)
		}
	}
}
