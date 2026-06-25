// Package jwt 提供JWT认证
package jwt

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims 自定义Claims
type Claims struct {
	UserID   int64  `json:"user_id"`
	Phone    string `json:"phone"`
	UserType int    `json:"user_type"` // 1:用户 2:达人 3:管理员
	jwt.RegisteredClaims
}

// GenerateToken 生成Token
func GenerateToken(secret string, userID int64, phone string, userType int, expireSeconds int) (string, error) {
	claims := Claims{
		UserID:   userID,
		Phone:    phone,
		UserType: userType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireSeconds) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken 解析Token
func ParseToken(secret, tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("签名方法错误")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("token无效")
}

// GenerateRefreshToken 生成刷新Token
func GenerateRefreshToken(secret string, userID int64, expireSeconds int) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   "refresh",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireSeconds) * time.Second)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ID:        int64ToStr(userID),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseRefreshToken 解析刷新Token并返回用户ID
func ParseRefreshToken(secret, tokenStr string) (int64, error) {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("签名方法错误")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return 0, err
	}
	if !token.Valid || claims.Subject != "refresh" {
		return 0, errors.New("刷新token无效")
	}
	userID, err := strconv.ParseInt(claims.ID, 10, 64)
	if err != nil || userID <= 0 {
		return 0, errors.New("刷新token用户无效")
	}
	return userID, nil
}

func int64ToStr(n int64) string {
	if n == 0 {
		return "0"
	}
	negative := n < 0
	if negative {
		n = -n
	}

	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if negative {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
