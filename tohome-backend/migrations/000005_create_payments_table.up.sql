-- 支付记录表
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    payment_no VARCHAR(32) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    order_no VARCHAR(32) NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    pay_method SMALLINT NOT NULL,
    pay_channel VARCHAR(20),
    transaction_id VARCHAR(64),
    prepay_id VARCHAR(64),
    status SMALLINT DEFAULT 0,
    paid_at TIMESTAMP,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_payment_no ON payments(payment_no);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

COMMENT ON TABLE payments IS '支付记录表';
COMMENT ON COLUMN payments.pay_method IS '1:微信 2:支付宝 3:余额';
COMMENT ON COLUMN payments.status IS '0:待支付 1:支付成功 2:支付失败 3:已退款';

-- 退款记录表
CREATE TABLE IF NOT EXISTS refunds (
    id BIGSERIAL PRIMARY KEY,
    refund_no VARCHAR(32) NOT NULL UNIQUE,
    payment_id BIGINT NOT NULL REFERENCES payments(id),
    payment_no VARCHAR(32) NOT NULL,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    order_no VARCHAR(32) NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    transaction_id VARCHAR(64),
    status SMALLINT DEFAULT 0,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_user_id ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(status);

COMMENT ON TABLE refunds IS '退款记录表';
COMMENT ON COLUMN refunds.status IS '0:待审核 1:已退款 2:已拒绝';
