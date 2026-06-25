//go:build ignore
// +build ignore

// bcrypt_gen 生成 bcrypt 密码哈希值
// 用法:  go run test/bcrypt_gen/main.go <password>
package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "用法: go run test/bcrypt_gen/main.go <password>\n")
		os.Exit(1)
	}

	password := os.Args[1]
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Fprintf(os.Stderr, "生成失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(hash))
}
