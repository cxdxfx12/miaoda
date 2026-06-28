CREATE TABLE IF NOT EXISTS talent_services (
    id BIGSERIAL PRIMARY KEY,
    talent_id BIGINT NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    custom_price DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(talent_id, service_id)
);
CREATE INDEX IF NOT EXISTS idx_talent_services_talent_id ON talent_services(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_services_service_id ON talent_services(service_id);
