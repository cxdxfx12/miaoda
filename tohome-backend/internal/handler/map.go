// Package handler API 处理层 - 地图服务
package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// MapHandler 地图服务处理器
type MapHandler struct {
	svc *service.MapService
}

// NewMapHandler 创建地图处理器
func NewMapHandler(svc *service.MapService) *MapHandler {
	return &MapHandler{svc: svc}
}

// Geocode 地址转坐标
func (h *MapHandler) Geocode(c *gin.Context) {
	address := c.Query("address")
	if address == "" {
		response.ParamError(c, "地址不能为空")
		return
	}
	point, err := h.svc.Geocode(c.Request.Context(), address)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, point)
}

// ReverseGeocode 坐标转地址
func (h *MapHandler) ReverseGeocode(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		response.ParamError(c, "无效的纬度")
		return
	}
	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		response.ParamError(c, "无效的经度")
		return
	}
	address, err := h.svc.ReverseGeocode(c.Request.Context(), lat, lng)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"address": address, "lat": lat, "lng": lng})
}

// Distance 计算距离
func (h *MapHandler) Distance(c *gin.Context) {
	fromLat, _ := strconv.ParseFloat(c.Query("from_lat"), 64)
	fromLng, _ := strconv.ParseFloat(c.Query("from_lng"), 64)
	toLat, _ := strconv.ParseFloat(c.Query("to_lat"), 64)
	toLng, _ := strconv.ParseFloat(c.Query("to_lng"), 64)
	mode := c.DefaultQuery("mode", "driving")

	result, err := h.svc.Distance(c.Request.Context(),
		&service.GeoPoint{Lat: fromLat, Lng: fromLng},
		&service.GeoPoint{Lat: toLat, Lng: toLng},
		mode)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, result)
}

// Search 周边搜索
func (h *MapHandler) Search(c *gin.Context) {
	keyword := c.Query("keyword")
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	radiusStr := c.DefaultQuery("radius", "5000")

	lat, _ := strconv.ParseFloat(latStr, 64)
	lng, _ := strconv.ParseFloat(lngStr, 64)
	radius, _ := strconv.Atoi(radiusStr)

	results, err := h.svc.Search(c.Request.Context(), keyword,
		&service.GeoPoint{Lat: lat, Lng: lng}, radius)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, results)
}
