DROP INDEX IF EXISTS idx_admins_role_code;
DROP INDEX IF EXISTS idx_admins_city_name;
ALTER TABLE admins DROP COLUMN IF EXISTS role_code;
ALTER TABLE admins DROP COLUMN IF EXISTS city_name;
ALTER TABLE admins DROP COLUMN IF EXISTS permissions;
