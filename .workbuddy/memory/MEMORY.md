# 项目记忆

## 散户基金助手 App
- 单文件 SPA，清新简洁风格，Mobile-first
- 信号灯仪表盘市场温度，行业/概念板块切换，风险雷达三级分类
- 主力追踪 A股(北向+龙虎榜)/港股(南向)/美股(13F+做空)
- 自选 localStorage 持久化，信号中心多维筛选
- PWA 可安装到 Android 桌面
- 实时数据：腾讯行情 API JSONP 每 60 秒轮询 + EastMoney 北向资金
- 页面不可见时暂停刷新（visibilitychange）
