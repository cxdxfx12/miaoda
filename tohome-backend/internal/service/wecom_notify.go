package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/logger"
)

type weComOrderInfo struct {
	ID              int64   `db:"id"`
	OrderNo         string  `db:"order_no"`
	UserName        string  `db:"user_name"`
	UserPhone       string  `db:"user_phone"`
	TalentName      *string `db:"technician_name"`
	ServiceName     string  `db:"service_name"`
	OriginalAmount  float64 `db:"original_amount"`
	ExtraAmount     float64 `db:"extra_amount"`
	FinalAmount     float64 `db:"final_amount"`
	ServiceAddress  []byte  `db:"service_address"`
	AppointmentTime string  `db:"appointment_time"`
	Status          int     `db:"status"`
}

func SendWeComTestNotification(ctx context.Context, city string) error {
	return sendWeComMarkdown(ctx, city, "test", fmt.Sprintf("### %s\n> 企业微信通知测试成功\n\n城市：%s\n时间：%s", weComTitle(ctx), city, time.Now().Format("2006-01-02 15:04:05")))
}

func sendWeComOrderEvent(ctx context.Context, event string, orderID int64, extra map[string]string) {
	if getConfigValue(ctx, "wecom", "enabled", "0") != "1" {
		return
	}
	if getConfigValue(ctx, "wecom", "notify_"+event, "1") == "0" {
		return
	}
	db := database.Database()
	if db == nil {
		return
	}
	var order weComOrderInfo
	if err := db.GetContext(ctx, &order, `SELECT id, order_no, user_name, user_phone, technician_name, service_name, original_amount, extra_amount, final_amount, service_address, appointment_time::text, status FROM orders WHERE id = $1`, orderID); err != nil {
		logger.Warn("企业微信通知读取订单失败: order_id=%d err=%v", orderID, err)
		return
	}
	city, address := cityAndAddress(order.ServiceAddress)
	content := buildWeComOrderMarkdown(ctx, event, order, city, address, extra)
	if err := sendWeComMarkdown(ctx, city, event, content); err != nil {
		logger.Warn("企业微信通知发送失败: order_id=%d event=%s err=%v", orderID, event, err)
	}
}

func weComTitle(ctx context.Context) string {
	title := getConfigValue(ctx, "wecom", "title_prefix", "喵搭订单通知")
	if strings.TrimSpace(title) == "" {
		return "喵搭订单通知"
	}
	return title
}

func cityAndAddress(raw []byte) (string, string) {
	if len(raw) == 0 {
		return "未知城市", ""
	}
	var data map[string]interface{}
	if err := json.Unmarshal(raw, &data); err != nil {
		return "未知城市", ""
	}
	read := func(key string) string {
		if v, ok := data[key]; ok {
			return fmt.Sprint(v)
		}
		return ""
	}
	city := read("city")
	if city == "" {
		city = "未知城市"
	}
	parts := []string{read("province"), city, read("district"), read("detail"), read("address")}
	compact := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" && part != "<nil>" {
			compact = append(compact, part)
		}
	}
	return city, strings.Join(compact, "")
}

func buildWeComOrderMarkdown(ctx context.Context, event string, order weComOrderInfo, city, address string, extra map[string]string) string {
	eventTitles := map[string]string{
		"order_created":      "新订单",
		"payment_success":    "支付成功",
		"talent_accepted":    "达人接单",
		"talent_departed":    "达人已出发",
		"talent_arrived":     "达人已到达",
		"service_started":    "服务开始",
		"service_completed":  "服务完成",
		"order_cancelled":    "订单取消",
		"refund_success":     "退款成功",
		"dispatch_exception": "派单异常",
	}
	title := eventTitles[event]
	if title == "" {
		title = "订单动态"
	}
	talent := "待分配"
	if order.TalentName != nil && *order.TalentName != "" {
		talent = *order.TalentName
	}
	lines := []string{
		fmt.Sprintf("### %s｜%s", weComTitle(ctx), title),
		fmt.Sprintf("> 城市：%s", city),
		"",
		fmt.Sprintf("订单号：%s", order.OrderNo),
		fmt.Sprintf("服务项目：%s", order.ServiceName),
		fmt.Sprintf("用户：%s %s", order.UserName, maskPhone(order.UserPhone)),
		fmt.Sprintf("达人：%s", talent),
		fmt.Sprintf("服务金额：¥%.2f", order.OriginalAmount),
		fmt.Sprintf("车费：¥%.2f", order.ExtraAmount),
		fmt.Sprintf("订单总额：¥%.2f", order.FinalAmount),
		fmt.Sprintf("预约时间：%s", order.AppointmentTime),
	}
	if address != "" {
		lines = append(lines, fmt.Sprintf("服务地址：%s", address))
	}
	for k, v := range extra {
		if strings.TrimSpace(v) != "" {
			lines = append(lines, fmt.Sprintf("%s：%s", k, v))
		}
	}
	if event == "talent_departed" {
		lines = append(lines, "", "提示：达人已出发，车费已锁定不可退，服务项目金额仍可按规则退款。")
	}
	if getConfigValue(ctx, "wecom", "mention_all", "0") == "1" {
		lines = append(lines, "", "<@all>")
	}
	return strings.Join(lines, "\n")
}

func sendWeComMarkdown(ctx context.Context, city, event, content string) error {
	webhook := selectWeComWebhook(ctx, city)
	if webhook == "" {
		return fmt.Errorf("未配置企业微信 Webhook")
	}
	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"content": content,
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhook, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("企业微信返回状态码 %d", resp.StatusCode)
	}
	logger.Info("企业微信通知已发送: city=%s event=%s", city, event)
	return nil
}

func selectWeComWebhook(ctx context.Context, city string) string {
	cityMapRaw := getConfigValue(ctx, "wecom", "city_webhooks", "{}")
	var cityMap map[string]string
	if err := json.Unmarshal([]byte(cityMapRaw), &cityMap); err == nil {
		if webhook := strings.TrimSpace(cityMap[city]); webhook != "" {
			return webhook
		}
	}
	return strings.TrimSpace(getConfigValue(ctx, "wecom", "default_webhook", ""))
}

func maskPhone(phone string) string {
	if len(phone) < 7 {
		return phone
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}
