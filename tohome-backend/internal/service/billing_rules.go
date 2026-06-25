package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"math"
	"strconv"

	"github.com/miaoda/backend/pkg/database"
)

type travelFeeRule struct {
	Enabled    bool
	PricePerKM float64
	RoundTrip  bool
	MinFee     float64
	FreeKM     float64
}

func getConfigValue(ctx context.Context, group, key, fallback string) string {
	db := database.Database()
	if db == nil {
		return fallback
	}
	var value string
	if err := db.GetContext(ctx, &value, `SELECT value FROM system_configs WHERE group_name = $1 AND key = $2 LIMIT 1`, group, key); err != nil {
		return fallback
	}
	return value
}

func getTravelFeeRule(ctx context.Context) travelFeeRule {
	price, _ := strconv.ParseFloat(getConfigValue(ctx, "travel_fee", "price_per_km", "2"), 64)
	minFee, _ := strconv.ParseFloat(getConfigValue(ctx, "travel_fee", "min_fee", "0"), 64)
	freeKM, _ := strconv.ParseFloat(getConfigValue(ctx, "travel_fee", "free_km", "0"), 64)
	return travelFeeRule{
		Enabled:    getConfigValue(ctx, "travel_fee", "enabled", "1") != "0",
		PricePerKM: price,
		RoundTrip:  getConfigValue(ctx, "travel_fee", "round_trip", "1") != "0",
		MinFee:     minFee,
		FreeKM:     freeKM,
	}
}

func calculateTravelFee(distanceKM float64, rule travelFeeRule) float64 {
	if !rule.Enabled || rule.PricePerKM <= 0 || distanceKM <= rule.FreeKM {
		return 0
	}
	billableKM := distanceKM - rule.FreeKM
	if rule.RoundTrip {
		billableKM *= 2
	}
	fee := billableKM * rule.PricePerKM
	if fee > 0 && fee < rule.MinFee {
		fee = rule.MinFee
	}
	return math.Round(fee*100) / 100
}

func haversineKM(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return earthRadius * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

func latLngFromJSON(raw json.RawMessage) (float64, float64, bool) {
	if len(raw) == 0 {
		return 0, 0, false
	}
	var data map[string]interface{}
	if err := json.Unmarshal(raw, &data); err != nil {
		return 0, 0, false
	}
	read := func(keys ...string) (float64, bool) {
		for _, key := range keys {
			if value, ok := data[key]; ok {
				switch v := value.(type) {
				case float64:
					return v, true
				case string:
					if f, err := strconv.ParseFloat(v, 64); err == nil {
						return f, true
					}
				}
			}
		}
		return 0, false
	}
	lat, okLat := read("lat", "latitude")
	lng, okLng := read("lng", "lon", "longitude")
	return lat, lng, okLat && okLng && lat != 0 && lng != 0
}

func computeTravelFeeForOrder(ctx context.Context, technicianID *int64, address json.RawMessage) float64 {
	if technicianID == nil {
		return 0
	}
	userLat, userLng, ok := latLngFromJSON(address)
	if !ok {
		return 0
	}
	db := database.Database()
	if db == nil {
		return 0
	}
	var pos struct {
		Lat sql.NullFloat64 `db:"current_lat"`
		Lng sql.NullFloat64 `db:"current_lng"`
	}
	if err := db.GetContext(ctx, &pos, `SELECT current_lat, current_lng FROM technicians WHERE id = $1`, *technicianID); err != nil {
		return 0
	}
	if !pos.Lat.Valid || !pos.Lng.Valid {
		return 0
	}
	return calculateTravelFee(haversineKM(userLat, userLng, pos.Lat.Float64, pos.Lng.Float64), getTravelFeeRule(ctx))
}
