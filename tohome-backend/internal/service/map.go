// Package service 业务逻辑层 - 地图服务
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/logger"
)

// MapProvider 地图服务提供商接口
type MapProvider interface {
	// Geocode 地理编码：地址 -> 经纬度
	Geocode(ctx context.Context, address string) (*GeoPoint, error)
	// ReverseGeocode 逆地理编码：经纬度 -> 地址
	ReverseGeocode(ctx context.Context, lat, lng float64) (string, error)
	// Distance 计算两点距离
	Distance(ctx context.Context, from, to *GeoPoint, mode string) (*DistanceResult, error)
	// Search 周边搜索
	Search(ctx context.Context, keyword string, center *GeoPoint, radius int) ([]GeoPOI, error)
	// Direction 路线规划
	Direction(ctx context.Context, from, to *GeoPoint, mode string) (*DirectionResult, error)
}

// GeoPoint 地理坐标点
type GeoPoint struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// DistanceResult 距离计算结果
type DistanceResult struct {
	DistanceMeters float64 `json:"distance_meters"` // 距离（米）
	DurationSec    int     `json:"duration_sec"`    // 预计时间（秒）
	Mode           string  `json:"mode"`            // driving/walking
}

// GeoPOI 兴趣点
type GeoPOI struct {
	Name     string   `json:"name"`
	Address  string   `json:"address"`
	Location GeoPoint `json:"location"`
	Distance float64  `json:"distance"`
	Type     string   `json:"type"`
}

// DirectionResult 路线规划结果
type DirectionResult struct {
	DistanceMeters float64     `json:"distance_meters"`
	DurationSec    int         `json:"duration_sec"`
	Polyline       string      `json:"polyline"` // 路线坐标
	Steps          []RouteStep `json:"steps"`
}

// RouteStep 路线步骤
type RouteStep struct {
	Instruction    string  `json:"instruction"`
	DistanceMeters float64 `json:"distance_meters"`
	DurationSec    int     `json:"duration_sec"`
}

// MapService 地图服务
type MapService struct {
	provider   MapProvider
	talentRepo *repository.TalentRepository
	cache      *sync.Map
	cacheTTL   time.Duration
}

// NewMapService 创建地图服务
func NewMapService(cfg *config.Config, talentRepo *repository.TalentRepository) *MapService {
	ms := &MapService{
		talentRepo: talentRepo,
		cache:      &sync.Map{},
		cacheTTL:   3600 * time.Second,
	}

	// 根据配置选择地图提供商
	ctx := context.Background()
	amapKey := firstNonEmpty(
		getConfigValue(ctx, "map", "amap_key", ""),
		getConfigValue(ctx, "map", "amapKey", ""),
		cfg.ThirdParty.AMap.Key,
	)
	amapSecret := firstNonEmpty(
		getConfigValue(ctx, "map", "amap_secret", ""),
		getConfigValue(ctx, "map", "amapSecret", ""),
		cfg.ThirdParty.AMap.Secret,
	)
	cacheTTL := firstNonEmpty(
		getConfigValue(ctx, "map", "cache_ttl", ""),
		getConfigValue(ctx, "map", "cacheTTL", ""),
		"",
	)
	if ttl, err := time.ParseDuration(cacheTTL + "s"); err == nil && ttl > 0 {
		ms.cacheTTL = ttl
	}
	if amapKey != "" {
		ms.provider = NewAMapProvider(amapKey, amapSecret)
	} else {
		logger.Warn("未配置地图服务Key，使用空实现")
		ms.provider = &NoopMapProvider{}
	}

	return ms
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func (s *MapService) refreshConfig(ctx context.Context) {
	provider := firstNonEmpty(getConfigValue(ctx, "map", "provider", ""), "amap")
	amapKey := firstNonEmpty(
		getConfigValue(ctx, "map", "amap_key", ""),
		getConfigValue(ctx, "map", "amapKey", ""),
	)
	amapSecret := firstNonEmpty(
		getConfigValue(ctx, "map", "amap_secret", ""),
		getConfigValue(ctx, "map", "amapSecret", ""),
	)
	tencentKey := firstNonEmpty(
		getConfigValue(ctx, "map", "tencent_key", ""),
		getConfigValue(ctx, "map", "tencentKey", ""),
	)
	cacheTTL := firstNonEmpty(
		getConfigValue(ctx, "map", "cache_ttl", ""),
		getConfigValue(ctx, "map", "cacheTTL", ""),
	)
	if ttl, err := time.ParseDuration(cacheTTL + "s"); err == nil && ttl > 0 {
		s.cacheTTL = ttl
	}
	if provider == "amap" && amapKey != "" {
		s.provider = NewAMapProvider(amapKey, amapSecret)
		return
	}
	if provider == "tencent" && tencentKey != "" {
		s.provider = NewTencentMapProvider(tencentKey)
		return
	}
	// 百度配置先保存在后台，未接入时降级为直线距离，避免业务中断。
	if s.provider == nil || provider != "amap" {
		s.provider = &NoopMapProvider{}
	}
}

// Geocode 地理编码
func (s *MapService) Geocode(ctx context.Context, address string) (*GeoPoint, error) {
	s.refreshConfig(ctx)
	// 检查缓存
	cacheKey := "geocode:" + address
	if cached, ok := s.cache.Load(cacheKey); ok {
		if entry, ok := cached.(cacheEntry); ok && time.Since(entry.timestamp) < s.cacheTTL {
			return entry.point, nil
		}
	}

	point, err := s.provider.Geocode(ctx, address)
	if err != nil {
		return nil, err
	}

	s.cache.Store(cacheKey, cacheEntry{point: point, timestamp: time.Now()})
	return point, nil
}

// ReverseGeocode 逆地理编码
func (s *MapService) ReverseGeocode(ctx context.Context, lat, lng float64) (string, error) {
	s.refreshConfig(ctx)
	cacheKey := fmt.Sprintf("reverse:%f,%f", lat, lng)
	if cached, ok := s.cache.Load(cacheKey); ok {
		if entry, ok := cached.(cacheEntry); ok && time.Since(entry.timestamp) < s.cacheTTL {
			if entry.address != nil {
				return *entry.address, nil
			}
		}
	}

	address, err := s.provider.ReverseGeocode(ctx, lat, lng)
	if err != nil {
		return "", err
	}

	s.cache.Store(cacheKey, cacheEntry{address: &address, timestamp: time.Now()})
	return address, nil
}

// Distance 计算距离
func (s *MapService) Distance(ctx context.Context, from, to *GeoPoint, mode string) (*DistanceResult, error) {
	s.refreshConfig(ctx)
	if mode == "" {
		mode = "driving"
	}
	return s.provider.Distance(ctx, from, to, mode)
}

// SearchNearby 周边搜索
func (s *MapService) SearchNearby(ctx context.Context, keyword string, center *GeoPoint, radius int) ([]GeoPOI, error) {
	s.refreshConfig(ctx)
	if radius <= 0 {
		radius = 5000
	}
	return s.provider.Search(ctx, keyword, center, radius)
}

// Search 搜索（别名，兼容 handler 调用）
func (s *MapService) Search(ctx context.Context, keyword string, center *GeoPoint, radius int) ([]GeoPOI, error) {
	return s.SearchNearby(ctx, keyword, center, radius)
}

// Direction 路线规划
func (s *MapService) Direction(ctx context.Context, from, to *GeoPoint, mode string) (*DirectionResult, error) {
	s.refreshConfig(ctx)
	if mode == "" {
		mode = "driving"
	}
	return s.provider.Direction(ctx, from, to, mode)
}

// SearchNearbyTalents 搜索附近达人
func (s *MapService) SearchNearbyTalents(ctx context.Context, lat, lng, radiusKm float64, limit int) ([]model.Talent, error) {
	if s.talentRepo == nil {
		return nil, fmt.Errorf("达人仓储未初始化")
	}
	if radiusKm <= 0 {
		radiusKm = 5
	}
	if limit <= 0 {
		limit = 20
	}
	return s.talentRepo.FindNearby(ctx, lat, lng, radiusKm, limit)
}

// QuickDistance 快速计算两点直线距离（Haversine公式，单位米）
func QuickDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// cacheEntry 缓存条目
type cacheEntry struct {
	point     *GeoPoint
	address   *string
	timestamp time.Time
}

// --- 高德地图实现 ---

// AMapProvider 高德地图服务提供商
type AMapProvider struct {
	key    string
	secret string
	client *http.Client
}

// NewAMapProvider 创建高德地图提供商
func NewAMapProvider(key, secret string) *AMapProvider {
	return &AMapProvider{
		key:    key,
		secret: secret,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// AMapGeocodeResponse 高德地理编码响应
type AMapGeocodeResponse struct {
	Status   string `json:"status"`
	Info     string `json:"info"`
	Geocodes []struct {
		Location string `json:"location"`
		Level    string `json:"level"`
	} `json:"geocodes"`
}

// Geocode 高德地理编码
func (p *AMapProvider) Geocode(ctx context.Context, address string) (*GeoPoint, error) {
	u := fmt.Sprintf("https://restapi.amap.com/v3/geocode/geo?key=%s&address=%s&output=JSON",
		p.key, url.QueryEscape(address))

	resp, err := p.client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("高德地理编码请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result AMapGeocodeResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析高德响应失败: %w", err)
	}

	if result.Status != "1" || len(result.Geocodes) == 0 {
		return nil, fmt.Errorf("地理编码失败: %s", result.Info)
	}

	// 解析 "lng,lat" 格式
	var lng, lat float64
	fmt.Sscanf(result.Geocodes[0].Location, "%f,%f", &lng, &lat)

	return &GeoPoint{Lat: lat, Lng: lng}, nil
}

// AMapRegeoResponse 高德逆地理编码响应
type AMapRegeoResponse struct {
	Status    string `json:"status"`
	Info      string `json:"info"`
	Regeocode struct {
		FormattedAddress string `json:"formatted_address"`
	} `json:"regeocode"`
}

// ReverseGeocode 高德逆地理编码
func (p *AMapProvider) ReverseGeocode(ctx context.Context, lat, lng float64) (string, error) {
	u := fmt.Sprintf("https://restapi.amap.com/v3/geocode/regeo?key=%s&location=%f,%f&output=JSON",
		p.key, lng, lat)

	resp, err := p.client.Get(u)
	if err != nil {
		return "", fmt.Errorf("高德逆地理编码请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result AMapRegeoResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("解析高德响应失败: %w", err)
	}

	if result.Status != "1" {
		return "", fmt.Errorf("逆地理编码失败: %s", result.Info)
	}

	return result.Regeocode.FormattedAddress, nil
}

// AMapDistanceResponse 高德距离测量响应
type AMapDistanceResponse struct {
	Status  string `json:"status"`
	Info    string `json:"info"`
	Results []struct {
		Distance string `json:"distance"`
		Duration string `json:"duration"`
	} `json:"results"`
}

// Distance 高德距离计算
func (p *AMapProvider) Distance(ctx context.Context, from, to *GeoPoint, mode string) (*DistanceResult, error) {
	// 高德距离测量 API
	modeStr := "0" // 驾车
	if mode == "walking" {
		modeStr = "1"
	}

	u := fmt.Sprintf("https://restapi.amap.com/v3/distance?key=%s&origins=%f,%f&destination=%f,%f&type=%s&output=JSON",
		p.key, from.Lng, from.Lat, to.Lng, to.Lat, modeStr)

	resp, err := p.client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("高德距离计算请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result AMapDistanceResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析高德响应失败: %w", err)
	}

	if result.Status != "1" || len(result.Results) == 0 {
		return nil, fmt.Errorf("距离计算失败: %s", result.Info)
	}

	var distance, duration float64
	fmt.Sscanf(result.Results[0].Distance, "%f", &distance)
	fmt.Sscanf(result.Results[0].Duration, "%f", &duration)

	return &DistanceResult{
		DistanceMeters: distance,
		DurationSec:    int(duration),
		Mode:           mode,
	}, nil
}

// Search 高德周边搜索
func (p *AMapProvider) Search(ctx context.Context, keyword string, center *GeoPoint, radius int) ([]GeoPOI, error) {
	u := fmt.Sprintf("https://restapi.amap.com/v3/place/around?key=%s&keywords=%s&location=%f,%f&radius=%d&output=JSON",
		p.key, url.QueryEscape(keyword), center.Lng, center.Lat, radius)

	resp, err := p.client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("高德周边搜索请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Status string `json:"status"`
		Info   string `json:"info"`
		Pois   []struct {
			Name     string `json:"name"`
			Address  string `json:"address"`
			Location string `json:"location"`
			Distance string `json:"distance"`
			Type     string `json:"type"`
		} `json:"pois"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析高德响应失败: %w", err)
	}

	if result.Status != "1" {
		return nil, fmt.Errorf("周边搜索失败: %s", result.Info)
	}

	var pois []GeoPOI
	for _, p := range result.Pois {
		var lng, lat, dist float64
		fmt.Sscanf(p.Location, "%f,%f", &lng, &lat)
		fmt.Sscanf(p.Distance, "%f", &dist)

		pois = append(pois, GeoPOI{
			Name:     p.Name,
			Address:  p.Address,
			Location: GeoPoint{Lat: lat, Lng: lng},
			Distance: dist,
			Type:     p.Type,
		})
	}

	return pois, nil
}

// Direction 高德路线规划
func (p *AMapProvider) Direction(ctx context.Context, from, to *GeoPoint, mode string) (*DirectionResult, error) {
	// 高德路径规划 API
	apiType := "driving"
	if mode == "walking" {
		apiType = "walking"
	}

	u := fmt.Sprintf("https://restapi.amap.com/v3/direction/%s?key=%s&origin=%f,%f&destination=%f,%f&output=JSON",
		apiType, p.key, from.Lng, from.Lat, to.Lng, to.Lat)

	resp, err := p.client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("高德路线规划请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Status string `json:"status"`
		Info   string `json:"info"`
		Route  struct {
			Paths []struct {
				Distance string `json:"distance"`
				Duration string `json:"duration"`
				Steps    []struct {
					Instruction string `json:"instruction"`
					Distance    string `json:"distance"`
					Duration    string `json:"duration"`
				} `json:"steps"`
			} `json:"paths"`
		} `json:"route"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析高德响应失败: %w", err)
	}

	if result.Status != "1" || len(result.Route.Paths) == 0 {
		return nil, fmt.Errorf("路线规划失败: %s", result.Info)
	}

	path := result.Route.Paths[0]
	var distance, duration float64
	fmt.Sscanf(path.Distance, "%f", &distance)
	fmt.Sscanf(path.Duration, "%f", &duration)

	dirResult := &DirectionResult{
		DistanceMeters: distance,
		DurationSec:    int(duration),
	}

	for _, step := range path.Steps {
		var stepDist, stepDur float64
		fmt.Sscanf(step.Distance, "%f", &stepDist)
		fmt.Sscanf(step.Duration, "%f", &stepDur)

		dirResult.Steps = append(dirResult.Steps, RouteStep{
			Instruction:    step.Instruction,
			DistanceMeters: stepDist,
			DurationSec:    int(stepDur),
		})
	}

	return dirResult, nil
}

// --- 腾讯地图实现 ---

type TencentMapProvider struct {
	key    string
	client *http.Client
}

func NewTencentMapProvider(key string) *TencentMapProvider {
	return &TencentMapProvider{key: key, client: &http.Client{Timeout: 10 * time.Second}}
}

func (p *TencentMapProvider) Geocode(ctx context.Context, address string) (*GeoPoint, error) {
	u := fmt.Sprintf("https://apis.map.qq.com/ws/geocoder/v1/?address=%s&key=%s", url.QueryEscape(address), p.key)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("腾讯地图地理编码请求失败: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Status  int    `json:"status"`
		Message string `json:"message"`
		Result  struct {
			Location struct {
				Lat float64 `json:"lat"`
				Lng float64 `json:"lng"`
			} `json:"location"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	if result.Status != 0 {
		return nil, fmt.Errorf("腾讯地图地理编码失败: %s", result.Message)
	}
	return &GeoPoint{Lat: result.Result.Location.Lat, Lng: result.Result.Location.Lng}, nil
}

func (p *TencentMapProvider) ReverseGeocode(ctx context.Context, lat, lng float64) (string, error) {
	u := fmt.Sprintf("https://apis.map.qq.com/ws/geocoder/v1/?location=%f,%f&key=%s", lat, lng, p.key)
	resp, err := p.client.Get(u)
	if err != nil {
		return "", fmt.Errorf("腾讯地图逆地理编码请求失败: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Status  int    `json:"status"`
		Message string `json:"message"`
		Result  struct {
			Address            string `json:"address"`
			FormattedAddresses struct {
				Recommend string `json:"recommend"`
			} `json:"formatted_addresses"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	if result.Status != 0 {
		return "", fmt.Errorf("腾讯地图逆地理编码失败: %s", result.Message)
	}
	if result.Result.FormattedAddresses.Recommend != "" {
		return result.Result.FormattedAddresses.Recommend, nil
	}
	return result.Result.Address, nil
}

func (p *TencentMapProvider) Distance(ctx context.Context, from, to *GeoPoint, mode string) (*DistanceResult, error) {
	apiMode := "driving"
	if mode == "walking" {
		apiMode = "walking"
	}
	u := fmt.Sprintf("https://apis.map.qq.com/ws/distance/v1/matrix/?mode=%s&from=%f,%f&to=%f,%f&key=%s", apiMode, from.Lat, from.Lng, to.Lat, to.Lng, p.key)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("腾讯地图距离计算请求失败: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Status  int    `json:"status"`
		Message string `json:"message"`
		Result  struct {
			Rows []struct {
				Elements []struct {
					Distance float64 `json:"distance"`
					Duration float64 `json:"duration"`
				} `json:"elements"`
			} `json:"rows"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	if result.Status != 0 || len(result.Result.Rows) == 0 || len(result.Result.Rows[0].Elements) == 0 {
		return nil, fmt.Errorf("腾讯地图距离计算失败: %s", result.Message)
	}
	item := result.Result.Rows[0].Elements[0]
	return &DistanceResult{DistanceMeters: item.Distance, DurationSec: int(item.Duration), Mode: mode}, nil
}

func (p *TencentMapProvider) Search(ctx context.Context, keyword string, center *GeoPoint, radius int) ([]GeoPOI, error) {
	u := fmt.Sprintf("https://apis.map.qq.com/ws/place/v1/search?keyword=%s&boundary=nearby(%f,%f,%d)&key=%s", url.QueryEscape(keyword), center.Lat, center.Lng, radius, p.key)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("腾讯地图周边搜索请求失败: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Status  int    `json:"status"`
		Message string `json:"message"`
		Data    []struct {
			Title    string `json:"title"`
			Address  string `json:"address"`
			Category string `json:"category"`
			Location struct {
				Lat float64 `json:"lat"`
				Lng float64 `json:"lng"`
			} `json:"location"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	if result.Status != 0 {
		return nil, fmt.Errorf("腾讯地图周边搜索失败: %s", result.Message)
	}
	pois := make([]GeoPOI, 0, len(result.Data))
	for _, item := range result.Data {
		pois = append(pois, GeoPOI{Name: item.Title, Address: item.Address, Type: item.Category, Location: GeoPoint{Lat: item.Location.Lat, Lng: item.Location.Lng}, Distance: QuickDistance(center.Lat, center.Lng, item.Location.Lat, item.Location.Lng)})
	}
	return pois, nil
}

func (p *TencentMapProvider) Direction(ctx context.Context, from, to *GeoPoint, mode string) (*DirectionResult, error) {
	dist, err := p.Distance(ctx, from, to, mode)
	if err != nil {
		return nil, err
	}
	return &DirectionResult{DistanceMeters: dist.DistanceMeters, DurationSec: dist.DurationSec}, nil
}

// --- 空实现（未配置Key时使用） ---

// NoopMapProvider 空地图服务实现
type NoopMapProvider struct{}

func (p *NoopMapProvider) Geocode(ctx context.Context, address string) (*GeoPoint, error) {
	return nil, fmt.Errorf("地图服务未配置API Key")
}

func (p *NoopMapProvider) ReverseGeocode(ctx context.Context, lat, lng float64) (string, error) {
	return "", fmt.Errorf("地图服务未配置API Key")
}

func (p *NoopMapProvider) Distance(ctx context.Context, from, to *GeoPoint, mode string) (*DistanceResult, error) {
	// 降级为直线距离
	dist := QuickDistance(from.Lat, from.Lng, to.Lat, to.Lng)
	return &DistanceResult{
		DistanceMeters: dist,
		DurationSec:    int(dist / 10), // 粗略估算：10m/s
		Mode:           mode,
	}, nil
}

func (p *NoopMapProvider) Search(ctx context.Context, keyword string, center *GeoPoint, radius int) ([]GeoPOI, error) {
	return nil, fmt.Errorf("地图服务未配置API Key")
}

func (p *NoopMapProvider) Direction(ctx context.Context, from, to *GeoPoint, mode string) (*DirectionResult, error) {
	return nil, fmt.Errorf("地图服务未配置API Key")
}
