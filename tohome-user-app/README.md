# ToHome 用户端 APP

基于 React Native 0.75+ 的上门按摩O2O平台用户端。

## 技术栈

- **框架**: React Native 0.75.4
- **导航**: React Navigation 6.x
- **状态管理**: Zustand 4.5+
- **数据请求**: TanStack Query (React Query) 5.x
- **UI**: Phosphor Icons + 自研组件库
- **HTTP**: Axios
- **存储**: AsyncStorage

## 功能模块

- 首页：服务分类、附近技师、优惠活动
- 服务列表：分类浏览、关键词搜索
- 服务详情：服务介绍、规格选择、技师推荐
- 订单管理：订单列表、订单详情、订单跟踪
- 支付：微信支付、支付宝
- 个人中心：用户信息、地址管理、优惠券、收藏
- 评价：订单评价、技师评价

## 项目结构

```
src/
├── api/              # API接口
├── components/       # 通用组件
├── navigation/       # 导航
├── screens/          # 页面
├── store/            # 状态管理
├── theme/            # 主题样式
├── types/            # 类型定义
├── utils/            # 工具函数
├── assets/           # 静态资源
└── config.ts         # 应用配置
```

## 启动

```bash
# 安装依赖
npm install

# 启动Metro
npm start

# 运行Android
npm run android

# 运行iOS
npm run ios
```

## 构建

```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

## 设计规范

- **主色**: #6B7FD7（柔和蓝紫色）
- **辅色**: #FFB84D（温暖橙）
- **图标库**: Phosphor Icons
- **设计风格**: 卡片式布局、圆角设计、柔和阴影

## API地址

- 开发: http://localhost:8080/api/v1
- 生产: https://api.tohome.com/api/v1
