# 技术栈与依赖

## 前端技术
| 技术 | 版本 | 用途 |
|------|------|------|
| HTML5 | - | 页面结构 |
| CSS3 | - | 玻璃态样式、渐变背景、动画 |
| JavaScript (ES6+) | - | 核心逻辑，无框架 |

## 第三方库
| 库 | 版本 | 来源 | 用途 |
|------|------|------|------|
| Chart.js | 4.4.7 | CDN | 24小时温度折线图 |
| Lottie Player | 2.0.12 | CDN | 天气动画播放 |
| Google Fonts (Inter + Noto Sans SC) | - | CDN | 字体 |

## API 服务
| API | 用途 | 备注 |
|------|------|------|
| Open-Meteo Geocoding | 地名搜索 | 免费，无 Key |
| Open-Meteo Forecast | 天气数据 | 免费，无 Key |
| Open-Meteo Air Quality | AQI 数据 | 免费，US AQI 标准 |
| BigDataCloud Reverse Geocode | 反向地址解析 | 免费，定位地名 |
| OpenWeatherMap OneCall | UV/AQI 补充数据 | 需配置 API Key |

## 数据存储
- localStorage：城市收藏、上次城市、主题模式

## 部署
- GitHub Pages（静态托管）
- GitHub Actions 自动部署（push 到 main 分支）

## 约束
- 无构建工具（无打包/压缩）
- 单文件架构（app.js 1742行）
- 无后端服务