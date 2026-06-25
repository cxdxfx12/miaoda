//go:build ignore
// +build ignore

// token_gen 生成用于端到端测试的 JWT token
// 用法: go run test/token_gen/main.go [user_type] [user_id] [phone]
package main

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   int64  `json:"user_id"`
	Phone    string `json:"phone"`
	UserType int    `json:"user_type"`
	jwt.RegisteredClaims
}

const secret = "miaoda-secret-key-2024"

func main() {
	if len(os.Args) < 4 {
		fmt.Fprintf(os.Stderr, "用法: go run test/token_gen/main.go <user_type> <user_id> <phone>\n")
		fmt.Fprintf(os.Stderr, "  user_type: 1=用户 2=达人 3=管理员\n")
		os.Exit(1)
	}

	userType, _ := strconv.Atoi(os.Args[1])
	userID, _ := strconv.ParseInt(os.Args[2], 10, 64)
	phone := os.Args[3]

	claims := Claims{
		UserID:   userID,
		Phone:    phone,
		UserType: userType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		fmt.Fprintf(os.Stderr, "生成token失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(signed)
}
