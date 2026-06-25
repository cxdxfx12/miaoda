-- 优惠券表
CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type SMALLINT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    scope SMALLINT DEFAULT 0,
    scope_ids JSONB DEFAULT '[]',
    total_count INTEGER DEFAULT 0,
    receive_count INTEGER DEFAULT 0,
    per_limit INTEGER DEFAULT 1,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_time ON coupons(start_time, end_time);

COMMENT ON TABLE coupons IS '优惠券表';
COMMENT ON COLUMN coupons.type IS '1:满减券 2:折扣券 3:现金券';
COMMENT ON COLUMN coupons.scope IS '0:全场 1:指定服务 2:指定技师';

-- 用户优惠券表
CREATE TABLE IF NOT EXISTS user_coupons (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    coupon_id BIGINT NOT NULL REFERENCES coupons(id),
    status SMALLINT DEFAULT 0,
    order_id BIGINT,
    used_at TIMESTAMP,
    expire_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
CREATE INDEX idx_user_coupons_expire ON user_coupons(expire_at);

COMMENT ON TABLE user_coupons IS '用户优惠券表';
COMMENT ON COLUMN user_coupons.status IS '0:未使用 1:已使用 2:已过期';
