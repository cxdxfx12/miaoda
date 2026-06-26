ALTER TABLE admins ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) DEFAULT 'super_admin';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS city_name VARCHAR(50) DEFAULT '';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

UPDATE admins
SET role_code = CASE WHEN role_id = 1 OR username = 'admin' THEN 'super_admin' ELSE COALESCE(role_code, 'operator') END,
    permissions = CASE WHEN role_id = 1 OR username = 'admin' THEN '["*"]'::jsonb ELSE COALESCE(permissions, '[]'::jsonb) END
WHERE role_code IS NULL OR role_code = '';

CREATE INDEX IF NOT EXISTS idx_admins_role_code ON admins(role_code);
CREATE INDEX IF NOT EXISTS idx_admins_city_name ON admins(city_name);
