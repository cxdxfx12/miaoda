// Package middleware 提供Gin中间件
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/pkg/jwt"
	"github.com/miaoda/backend/pkg/response"
)

// JWTAuth JWT认证中间件
func JWTAuth(cfg *config.JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从Header获取Token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		// 解析Bearer Token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		// 验证Token
		claims, err := jwt.ParseToken(cfg.Secret, parts[1])
		if err != nil {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		// 存储用户信息到Context
		c.Set("user_id", claims.UserID)
		c.Set("phone", claims.Phone)
		c.Set("user_type", claims.UserType)

		c.Next()
	}
}

// UserAuth 用户认证中间件
func UserAuth(cfg *config.JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		JWTAuth(cfg)(c)
		if c.IsAborted() {
			return
		}
		userType, _ := c.Get("user_type")
		if userType != 1 {
			response.FailWithStatus(c, http.StatusForbidden, response.CodeForbidden, "非用户身份")
			c.Abort()
			return
		}
		c.Next()
	}
}

// TalentAuth 达人认证中间件
func TalentAuth(cfg *config.JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		JWTAuth(cfg)(c)
		if c.IsAborted() {
			return
		}
		userType, _ := c.Get("user_type")
		if userType != 2 {
			response.FailWithStatus(c, http.StatusForbidden, response.CodeForbidden, "非达人身份")
			c.Abort()
			return
		}
		c.Next()
	}
}

// AdminAuth 管理员认证中间件
func AdminAuth(cfg *config.JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		JWTAuth(cfg)(c)
		if c.IsAborted() {
			return
		}
		userType, _ := c.Get("user_type")
		if userType != 3 {
			response.FailWithStatus(c, http.StatusForbidden, response.CodeForbidden, "非管理员身份")
			c.Abort()
			return
		}
		c.Next()
	}
}

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Request-ID, X-Platform, X-Version")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// RequestID 请求ID中间件
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateUUID()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func generateUUID() string {
	// 简化版本，实际可以使用google/uuid
	return "req-" + timeNow()
}

func timeNow() string {
	return timeNowString()
}
