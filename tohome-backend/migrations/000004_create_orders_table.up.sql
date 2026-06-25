-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    user_name VARCHAR(50),
    user_phone VARCHAR(20),
    technician_id BIGINT REFERENCES technicians(id),
    technician_name VARCHAR(50),
    technician_phone VARCHAR(20),
    service_id BIGINT NOT NULL REFERENCES services(id),
    service_name VARCHAR(100),
    service_spec VARCHAR(50),
    service_duration INTEGER,
    service_address JSONB NOT NULL,
    appointment_time TIMESTAMP NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    original_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    extra_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    technician_income DECIMAL(10,2) DEFAULT 0,
    coupon_id BIGINT,
    coupon_name VARCHAR(100),
    status SMALLINT DEFAULT 0,
    cancel_reason VARCHAR(255),
    cancel_by SMALLINT,
    remark TEXT,
    paid_at TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_technician_id ON orders(technician_id);
CREATE INDEX idx_orders_service_id ON orders(service_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_appointment_time ON orders(appointment_time);
CREATE INDEX idx_orders_created_at ON orders(created_at);

COMMENT ON TABLE orders IS '订单表';
COMMENT ON COLUMN orders.status IS '0:待支付 1:待接单 2:已接单 3:服务中 4:已完成 5:已取消 6:已退款';
