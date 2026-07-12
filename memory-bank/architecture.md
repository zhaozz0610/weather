# 架构与重要决策

## 项目结构
```
天气仪表盘/
├── outputs/              # GitHub Pages 源目录（部署根）
│   ├── index.html        # 主页面（154行）
│   ├── app.js            # 核心逻辑（1742行）
│   └── styles.css        # 样式（924行）
├── .github/workflows/
│   └── deploy-pages.yml  # GitHub Actions 自动部署
├── AGENTS.md             # Memory Bank 协议
└── memory-bank/          # 项目记忆库
```

## 核心模块划分（app.js）

### 1. 配置与常量（1-26行）
- API URL 定义
- localStorage Key 常量
- 防抖时间（650ms）、自动刷新（60s）

### 2. DOM 元素引用（28-54行）
- 全局 DOM 元素缓存

### 3. 状态管理（55-64行）
- currentCity、favorites、isLoading 等

### 4. 区县修正表（66-87行）
- 潮南区等硬编码地名数据

### 5. 天气代码映射（89-118行）
- WMO 天气代码 → 中文描述

### 6. 工具函数（120-172行）
- loadJson、saveJson、setStatus、setLoading、fetchJson

### 7. 地名规范化（173-251行）
- normalizeCity、normalizeCorrectedDistrict、normalizeCurrentLocation

### 8. Lottie 动画（257-522行）
- getWeatherAnimationType、createLottieAnimationData、renderWeatherAnimation

### 9. 主题系统（524-617行）
- 日间/夜间模式切换
- 天气主题映射（sunny/rainy/snowy/stormy/cloudy）

### 10. Canvas 背景特效（619-1062行）
- weatherBackgroundEffect 模块
- 粒子系统：阳光、雨、雪、云

### 11. AQI/UVI 数据（1068-1252行）
- getAqiMeta、getUviMeta
- OpenWeatherMap + Open-Meteo 数据源

### 12. 搜索与定位（1290-1346行）
- searchPlaces、searchPlacesDebounced、reverseGeocode

### 13. 天气数据获取（1348-1359行）
- fetchWeather（Open-Meteo）

### 14. UI 渲染（1361-1536行）
- renderSearchResults、renderCurrent、renderForecast、renderChart、renderFavorites

### 15. 核心流程（1537-1741行）
- loadCity、boot、事件监听

## 重要决策

### 1. API 选择
- 主用 Open-Meteo（免费无 Key）
- 备用 OpenWeatherMap（需 Key，获取 UV/AQI）

### 2. 动画策略
- Lottie 优先加载
- CSS fallback 确保无依赖时也能显示

### 3. 状态管理
- 无框架，纯变量 + localStorage
- 收藏城市最多8个

### 4. 响应式
- 420px 宽度优先
- 无复杂布局切换

### 5. 性能
- 防抖搜索（650ms）
- Canvas 动画使用 requestAnimationFrame
- 页面隐藏时停止动画

### 6. 无障碍
- aria-label、aria-live
- screen reader 专用隐藏文本（.sr-only）