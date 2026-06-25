# 到家按摩 - 管理后台

> Next.js 15 + TypeScript + Tailwind CSS 4 实现的现代化管理后台

## 功能模块

- **数据概览** - 实时业务数据可视化
- **订单管理** - 全流程订单跟踪与处理
- **技师管理** - 技师档案、审核、分配
- **用户管理** - 用户信息、消费、会员等级
- **派单调度** - 智能派单、实时地图
- **财务管理** - 营收、流水、退款
- **营销中心** - 优惠券、活动管理
- **评价管理** - 用户评价与回复
- **数据分析** - 多维度业务洞察
- **系统设置** - 平台配置、权限、备份

## 技术栈

- Next.js 15.0.3 (App Router)
- React 18.3.1
- TypeScript 5.6
- Tailwind CSS 4.0
- Radix UI (shadcn/ui 风格)
- Recharts (图表)
- Zustand (状态管理)
- Lucide React (图标)
- Axios (HTTP 客户端)

## 设计系统

### 主题色
- **主色**: `#6B7FD7` (蓝紫色) - 专业、信任
- **辅色**: `#FFB84D` (暖橙色) - 活力、温暖
- **背景**: `#F5F7FA` - 干净、舒适

### 渐变
- 主色渐变: `linear-gradient(135deg, #6B7FD7 0%, #8B9AE3 100%)`
- 辅色渐变: `linear-gradient(135deg, #FFB84D 0%, #FFC97A 100%)`

### 字体
```
PingFang SC, Microsoft YaHei, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:3000)
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

## 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 鉴权页面
│   │   └── login/
│   ├── (dashboard)/       # 后台页面
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── technicians/
│   │   ├── users/
│   │   ├── finance/
│   │   ├── marketing/
│   │   ├── dispatch/
│   │   ├── reviews/
│   │   ├── analytics/
│   │   └── settings/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/            # 布局组件
│   │   ├── AdminLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── ui/                # 基础UI组件
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       └── table.tsx
├── lib/                   # 工具库
│   ├── api.ts            # API 客户端
│   └── utils.ts          # 通用工具
└── store/                 # 状态管理
    └── adminStore.ts     # 管理员状态
```

## 默认账号

- 用户名: `admin`
- 密码: `admin123`

## API 代理

通过 `next.config.js` 的 rewrites 配置,前端请求 `/api/*` 会自动代理到后端:
```
/api/* → http://localhost:8080/api/*
```

可通过环境变量 `NEXT_PUBLIC_API_URL` 修改后端地址。

## 部署

### Docker 部署
```bash
docker build -t tohome-admin .
docker run -p 3000:3000 tohome-admin
```

### Docker Compose
参见项目根目录 `docker-compose.yml`。

## 浏览器兼容性

- Chrome >= 90
- Edge >= 90
- Firefox >= 88
- Safari >= 14
