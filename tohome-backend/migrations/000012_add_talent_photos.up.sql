-- 达人资料扩展：生活照、艺术照
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS life_photos JSONB DEFAULT '[]';
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS art_photos JSONB DEFAULT '[]';

COMMENT ON COLUMN technicians.life_photos IS '生活照JSON数组，最多5张';
COMMENT ON COLUMN technicians.art_photos IS '艺术照/宣传照JSON数组，最多5张';
