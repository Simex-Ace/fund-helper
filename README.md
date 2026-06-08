# 散户基金助手 📊

逆向机构思维的基金/ETF/股票辅助分析工具。

## 本地目录结构

```
fund-helper/
├── public/                    ← Vercel 部署目录
│   ├── index.html             ← App 本体
│   ├── manifest.json          ← PWA 配置
│   └── sw.js                  ← Service Worker
├── scripts/
│   └── signal-generator.js    ← GitHub Actions 信号生成脚本
├── .github/workflows/
│   └── daily-signals.yml      ← 每日自动更新定时任务
└── README.md
```

## 部署步骤

### 1. 推送到 GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/fund-helper.git
git push -u origin main
```

### 2. 连接 Vercel
1. 打开 [vercel.com](https://vercel.com) → Import Repository
2. 选择 `fund-helper` 仓库
3. Root Directory: `public`
4. Framework Preset: `Other`
5. Deploy → 完成 ✅

### 3. 启用 GitHub Actions
推送后系统会自动启用，每天 9:00 更新信号。

## 数据来源
- 腾讯行情 API（`qt.gtimg.cn`）— 实时行情
- 东方财富 API（`eastmoney.com`）— 板块排行、北向资金
- 全部免费，无需 API Key
