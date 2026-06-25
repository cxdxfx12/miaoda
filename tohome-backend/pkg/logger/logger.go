// Package logger 提供统一日志管理
package logger

import (
	"os"
	"path/filepath"

	"github.com/sirupsen/logrus"
)

// Logger 全局Logger
var Logger *logrus.Logger

// Init 初始化日志
func Init(level, format, output, filePath string) error {
	Logger = logrus.New()
	
	// 设置日志级别
	levelMap := map[string]logrus.Level{
		"debug": logrus.DebugLevel,
		"info":  logrus.InfoLevel,
		"warn":  logrus.WarnLevel,
		"error": logrus.ErrorLevel,
		"fatal": logrus.FatalLevel,
	}
	if l, ok := levelMap[level]; ok {
		Logger.SetLevel(l)
	} else {
		Logger.SetLevel(logrus.InfoLevel)
	}

	// 设置日志格式
	if format == "json" {
		Logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02 15:04:05",
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
			},
		})
	} else {
		Logger.SetFormatter(&logrus.TextFormatter{
			TimestampFormat: "2006-01-02 15:04:05",
			FullTimestamp:   true,
		})
	}

	// 设置输出
	if output == "file" && filePath != "" {
		// 确保目录存在
		dir := filepath.Dir(filePath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
		f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			return err
		}
		Logger.SetOutput(f)
	} else {
		Logger.SetOutput(os.Stdout)
	}

	return nil
}

// Debug Debug级别日志
func Debug(format string, args ...interface{}) {
	Logger.Debugf(format, args...)
}

// Info Info级别日志
func Info(format string, args ...interface{}) {
	Logger.Infof(format, args...)
}

// Warn Warn级别日志
func Warn(format string, args ...interface{}) {
	Logger.Warnf(format, args...)
}

// Error Error级别日志
func Error(format string, args ...interface{}) {
	Logger.Errorf(format, args...)
}

// Fatal Fatal级别日志
func Fatal(format string, args ...interface{}) {
	Logger.Fatalf(format, args...)
}

// WithFields 添加字段
func WithFields(fields map[string]interface{}) *logrus.Entry {
	entry := Logger.WithFields(logrus.Fields{})
	for k, v := range fields {
		entry = entry.WithField(k, v)
	}
	return entry
}
