INSERT INTO system_configs (group_name, key, value, remark, updated_at) VALUES
('commission', 'commission_mode', 'monthly_revenue_tier', '按达人当月已完成营业额匹配最高分成档位', NOW()),
('commission', 'tier_1_threshold', '0', '档位1营业额门槛', NOW()),
('commission', 'tier_1_rate', '70', '档位1达人分成比例', NOW()),
('commission', 'tier_2_threshold', '5000', '档位2营业额门槛', NOW()),
('commission', 'tier_2_rate', '75', '档位2达人分成比例', NOW()),
('commission', 'tier_3_threshold', '10000', '档位3营业额门槛', NOW()),
('commission', 'tier_3_rate', '80', '档位3达人分成比例', NOW()),
('commission', 'tier_4_threshold', '20000', '档位4营业额门槛', NOW()),
('commission', 'tier_4_rate', '85', '档位4达人分成比例', NOW()),
('commission', 'settlement_scope', 'service_amount_only', '达人分成只计算服务项目金额，不包含车费', NOW()),
('travel_fee', 'enabled', '1', '是否启用车费', NOW()),
('travel_fee', 'price_per_km', '2', '每公里车费', NOW()),
('travel_fee', 'round_trip', '1', '是否按往返计费', NOW()),
('travel_fee', 'min_fee', '0', '起步车费', NOW()),
('travel_fee', 'free_km', '0', '免车费公里数', NOW()),
('travel_fee', 'refund_lock_status', 'departed', '达人出发后车费锁定不可退', NOW()),
('travel_fee', 'refund_policy', '出发前服务费和车费均可退；达人出发后车费不退，服务项目金额可按退款规则退。', '退款说明', NOW())
ON CONFLICT (group_name, key) DO UPDATE
SET value = EXCLUDED.value,
    remark = EXCLUDED.remark,
    updated_at = NOW();
