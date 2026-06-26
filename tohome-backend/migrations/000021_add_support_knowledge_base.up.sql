INSERT INTO system_configs (group_name, key, value, remark, updated_at) VALUES
('site', 'support_knowledge_base', '[
  {
    "question": "如何下单？",
    "keywords": ["下单", "预约", "怎么约", "怎么下单", "流程"],
    "answer": "您可以在首页或服务页选择服务项目，再选择合适的达人，确认服务时间和地址后提交订单并完成支付。支付成功后，达人会在订单页接单并与您确认服务安排。"
  },
  {
    "question": "退款政策",
    "keywords": ["退款", "退钱", "取消订单", "多久到账", "退款多久到账"],
    "answer": "如需退款，请进入订单详情页提交退款申请。达人未出发前通常可按规则退还服务费；达人出发后，车费可能不退，服务费按订单状态和平台规则处理。审核通过后一般 1-3 个工作日原路退回。"
  },
  {
    "question": "优惠券使用",
    "keywords": ["优惠券", "券", "红包", "抵扣", "新人券"],
    "answer": "优惠券会在下单结算页自动展示。满足使用门槛的优惠券可直接勾选抵扣，一个订单通常只能使用一张优惠券，具体以结算页展示为准。"
  },
  {
    "question": "投诉建议",
    "keywords": ["投诉", "建议", "不满意", "举报", "服务不好"],
    "answer": "如果您对服务不满意，可以在订单详情页提交投诉或联系在线客服。请尽量提供订单号、问题描述和相关截图，我们会尽快核实处理。"
  },
  {
    "question": "达人是否真实？",
    "keywords": ["真人", "认证", "达人真实", "安全吗", "安全"],
    "answer": "平台达人会经过基础资料审核和认证流程。您可以在达人详情页查看头像、评分、服务记录等信息。服务过程中如遇异常，请立即联系平台客服。"
  },
  {
    "question": "如何联系客服？",
    "keywords": ["客服", "电话", "联系", "人工", "转人工"],
    "answer": "您可以在当前页面继续留言，也可以拨打页面上方展示的客服热线。遇到订单紧急问题时，建议优先拨打客服电话处理。"
  }
]', '客服知识库 JSON', NOW())
ON CONFLICT (group_name, key) DO UPDATE SET value = EXCLUDED.value, remark = EXCLUDED.remark, updated_at = NOW()
WHERE system_configs.value IS NULL OR system_configs.value = '';
