ALTER TABLE users DROP COLUMN IF EXISTS openid;
ALTER TABLE users DROP COLUMN IF EXISTS unionid;

DELETE FROM system_configs WHERE group_name = 'wechat_mp';
