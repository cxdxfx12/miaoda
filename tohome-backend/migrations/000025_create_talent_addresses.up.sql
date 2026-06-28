CREATE TABLE IF NOT EXISTS talent_addresses (
    id BIGSERIAL PRIMARY KEY,
    talent_id BIGINT NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    name VARCHAR(50),
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    detail VARCHAR(255) NOT NULL,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_talent_addresses_talent_id ON talent_addresses(talent_id);
