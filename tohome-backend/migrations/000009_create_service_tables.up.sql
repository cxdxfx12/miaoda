-- 短信发送记录表
CREATE TABLE IF NOT EXISTS sms_logs (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10),
    type VARCHAR(20) NOT NULL,
    content VARCHAR(500),
    provider VARCHAR(20) NOT NULL DEFAULT 'aliyun',
    status SMALLINT DEFAULT 0,
    result TEXT,
    ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_logs_phone ON sms_logs(phone);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);

COMMENT ON TABLE sms_logs IS '短信发送记录表';
COMMENT ON COLUMN sms_logs.type IS 'login/register/notify';
COMMENT ON COLUMN sms_logs.status IS '0:发送中 1:成功 2:失败';

-- 虚拟电话绑定表
CREATE TABLE IF NOT EXISTS virtual_phones (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    user_phone VARCHAR(20) NOT NULL,
    talent_phone VARCHAR(20) NOT NULL,
    virtual_x VARCHAR(20) NOT NULL,
    bind_id VARCHAR(64),
    expire_at TIMESTAMP NOT NULL,
    unbind_at TIMESTAMP,
    status SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_virtual_phones_order_id ON virtual_phones(order_id);
CREATE INDEX idx_virtual_phones_bind_id ON virtual_phones(bind_id);
CREATE INDEX idx_virtual_phones_status ON virtual_phones(status);

COMMENT ON TABLE virtual_phones IS '虚拟电话绑定表';
COMMENT ON COLUMN virtual_phones.status IS '0:已绑定 1:已解绑';

-- 营销活动表
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    banner VARCHAR(500),
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status SMALLINT DEFAULT 0,
    rule JSONB DEFAULT '{}',
    order_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_time ON activities(start_time, end_time);
CREATE INDEX idx_activities_deleted_at ON activities(deleted_at);

COMMENT ON TABLE activities IS '营销活动表';
COMMENT ON COLUMN activities.status IS '0:草稿 1:进行中 2:已结束';

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id BIGSERIAL PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    remark VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_name, key)
);

CREATE INDEX idx_system_configs_group ON system_configs(group_name);

COMMENT ON TABLE system_configs IS '系统配置表';

-- 达人收入记录表
CREATE TABLE IF NOT EXISTS income_records (
    id BIGSERIAL PRIMARY KEY,
    technician_id BIGINT NOT NULL REFERENCES technicians(id),
    order_id BIGINT REFERENCES orders(id),
    order_no VARCHAR(32),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    record_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_income_records_technician ON income_records(technician_id);
CREATE INDEX idx_income_records_type ON income_records(type);
CREATE INDEX idx_income_records_record_at ON income_records(record_at);

COMMENT ON TABLE income_records IS '达人收入记录表';
COMMENT ON COLUMN income_records.type IS 'order:订单收入 withdraw:提现 bonus:奖励';

-- 达人审核记录表
CREATE TABLE IF NOT EXISTS talent_reviews (
    id BIGSERIAL PRIMARY KEY,
    talent_id BIGINT NOT NULL REFERENCES technicians(id),
    admin_id BIGINT REFERENCES admins(id),
    status SMALLINT NOT NULL,
    reason TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_talent_reviews_talent_id ON talent_reviews(talent_id);
CREATE INDEX idx_talent_reviews_status ON talent_reviews(status);

COMMENT ON TABLE talent_reviews IS '达人审核记录表';
COMMENT ON COLUMN talent_reviews.status IS '0:待审核 1:已通过 2:已驳回';

-- 插入默认系统配置
INSERT INTO system_configs (group_name, key, value, remark) VALUES
('platform', 'name', '喵搭', '平台名称'),
('platform', 'company', '杭州喵喵至家网络有限公司', '公司名称'),
('platform', 'customer_phone', '400-000-0000', '客服电话'),
('platform', 'customer_email', 'support@miaoda.cn', '客服邮箱'),
('platform', 'icp', '浙ICP备XXXXXXXX号', 'ICP备案号'),
('platform', 'description', '喵搭 - 您身边的上门按摩服务平台', '平台简介'),
('map', 'provider', 'amap', '地图服务商: amap/tencent/baidu'),
('map', 'amap_key', '', '高德地图Key'),
('map', 'amap_secret', '', '高德地图Secret'),
('map', 'search_radius', '5000', '搜索半径(米)'),
('map', 'cache_enabled', 'true', '启用地图缓存'),
('map', 'cache_ttl', '3600', '缓存时间(秒)'),
('payment', 'wechat_app_id', '', '微信支付AppID'),
('payment', 'wechat_mch_id', '', '微信支付商户号'),
('payment', 'wechat_api_key', '', '微信支付API密钥'),
('payment', 'alipay_app_id', '', '支付宝AppID'),
('payment', 'commission_rate', '0.20', '平台抽成比例'),
('payment', 'min_withdraw', '100', '最低提现金额'),
('payment', 'settle_cycle', 'T+0', '结算周期'),
('sms', 'provider', 'aliyun', '短信服务商'),
('sms', 'aliyun_key', '', '阿里云AccessKey'),
('sms', 'aliyun_secret', '', '阿里云Secret'),
('sms', 'sign_name', '喵搭', '短信签名'),
('sms', 'template_code', 'SMS_123456789', '短信模板'),
('sms', 'rate_limit', '60', '发送间隔(秒)'),
('sms', 'code_expire', '300', '验证码有效期(秒)'),
('virtual_phone', 'aliyun_key', '', '隐私号AccessKey'),
('virtual_phone', 'aliyun_secret', '', '隐私号Secret'),
('virtual_phone', 'pool_key', '', '号码池Key'),
('virtual_phone', 'bind_expire', '3600', '绑定有效期(秒)'),
('virtual_phone', 'max_daily', '100', '日最大绑定数'),
('notification', 'order_update', 'true', '订单状态推送'),
('notification', 'system_notice', 'true', '系统通知'),
('notification', 'talent_update', 'true', '达人消息');
