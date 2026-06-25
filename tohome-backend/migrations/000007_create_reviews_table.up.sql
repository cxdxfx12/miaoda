-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    user_name VARCHAR(50),
    technician_id BIGINT NOT NULL REFERENCES technicians(id),
    technician_name VARCHAR(50),
    service_id BIGINT NOT NULL REFERENCES services(id),
    service_name VARCHAR(100),
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    images JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    is_anonymous SMALLINT DEFAULT 0,
    reply_content TEXT,
    reply_at TIMESTAMP,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_technician_id ON reviews(technician_id);
CREATE INDEX idx_reviews_service_id ON reviews(service_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

COMMENT ON TABLE reviews IS '评价表';
COMMENT ON COLUMN reviews.is_anonymous IS '0:不匿名 1:匿名';
COMMENT ON COLUMN reviews.status IS '1:显示 0:隐藏';
