// Package response 提供统一响应封装
package response

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// 错误码定义
const (
	CodeSuccess      = 0
	CodeParamError   = 1001
	CodeUnauthorized = 1002
	CodeForbidden    = 1003
	CodeNotFound     = 1004
	CodeServerError  = 5000
	CodeBusinessError = 5001
)

// Response 统一响应结构
type Response struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

// PageData 分页数据
type PageData struct {
	List     interface{} `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:      CodeSuccess,
		Message:   "success",
		Data:      data,
		Timestamp: timeNow(),
	})
}

// SuccessWithMessage 带消息的成功响应
func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:      CodeSuccess,
		Message:   message,
		Data:      data,
		Timestamp: timeNow(),
	})
}

// Page 分页成功响应
func Page(c *gin.Context, list interface{}, total int64, page, pageSize int) {
	Success(c, PageData{
		List:     list,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// Fail 失败响应
func Fail(c *gin.Context, code int, message string) {
	c.JSON(http.StatusOK, Response{
		Code:      code,
		Message:   message,
		Timestamp: timeNow(),
	})
}

// FailWithStatus 带HTTP状态码的失败响应
func FailWithStatus(c *gin.Context, httpStatus, code int, message string) {
	c.JSON(httpStatus, Response{
		Code:      code,
		Message:   message,
		Timestamp: timeNow(),
	})
}

// ParamError 参数错误
func ParamError(c *gin.Context, message string) {
	if message == "" {
		message = "参数错误"
	}
	Fail(c, CodeParamError, message)
}

// Unauthorized 未授权
func Unauthorized(c *gin.Context) {
	Fail(c, CodeUnauthorized, "未授权")
}

// ServerError 服务器错误
func ServerError(c *gin.Context, message string) {
	if message == "" {
		message = "服务器内部错误"
	}
	Fail(c, CodeServerError, message)
}

// NotFound 资源不存在
func NotFound(c *gin.Context) {
	Fail(c, CodeNotFound, "资源不存在")
}

func timeNow() int64 {
	return time.Now().UnixMilli()
}
