INSERT INTO system_configs (group_name, key, value, remark, updated_at) VALUES
('wecom', 'enabled', '0', '是否启用企业微信通知', NOW()),
('wecom', 'default_webhook', '', '默认企业微信群机器人 Webhook', NOW()),
('wecom', 'city_webhooks', '{}', '城市 Webhook 映射 JSON', NOW()),
('wecom', 'title_prefix', '喵搭订单通知', '消息标题前缀', NOW()),
('wecom', 'mention_all', '0', '是否 @所有人', NOW()),
('wecom', 'notify_order_created', '1', '新订单通知', NOW()),
('wecom', 'notify_payment_success', '1', '支付成功通知', NOW()),
('wecom', 'notify_talent_accepted', '1', '达人接单通知', NOW()),
('wecom', 'notify_talent_departed', '1', '达人出发通知', NOW()),
('wecom', 'notify_talent_arrived', '1', '达人到达通知', NOW()),
('wecom', 'notify_service_started', '1', '服务开始通知', NOW()),
('wecom', 'notify_service_completed', '1', '服务完成通知', NOW()),
('wecom', 'notify_order_cancelled', '1', '订单取消通知', NOW()),
('wecom', 'notify_refund_success', '1', '退款成功通知', NOW()),
('wecom', 'notify_dispatch_exception', '1', '派单异常通知', NOW())
ON CONFLICT (group_name, key) DO UPDATE
SET value = EXCLUDED.value,
    remark = EXCLUDED.remark,
    updated_at = NOW();
