// === IOS POLISH: MODULE STRUCTURE ===
const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";
const forecastUrl = "https://api.open-meteo.com/v1/forecast";
const reverseGeocodingUrl = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const openWeatherOneCallUrl = "https://api.openweathermap.org/data/2.5/onecall";
const airQualityUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";
const favoritesKey = "weather-desk-favorites";
const lastCityKey = "weather-desk-last-city";
const themeModeKey = "weather-desk-theme-mode";
const searchDebounceMs = 650;
const autoRefreshMs = 60 * 1000;
const weatherMain = document.querySelector(".weather-main");

function readStoredValue(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

const openWeatherApiKey =
  globalThis.OPENWEATHER_API_KEY ||
  globalThis.OPENWEATHERMAP_API_KEY ||
  readStoredValue("OPENWEATHER_API_KEY") ||
  readStoredValue("openweather-api-key") ||
  readStoredValue("OPENWEATHERMAP_API_KEY") ||
  "";

const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const locationButton = document.querySelector("#location-button");
const searchResults = document.querySelector("#search-results");
const statusBar = document.querySelector("#status-bar");
const locationName = document.querySelector("#location-name");
const weatherState = document.querySelector("#weather-state");
const weatherAnimation = document.querySelector("#weather-animation");
const currentTemp = document.querySelector("#current-temp");
const humidity = document.querySelector("#humidity");
const windSpeed = document.querySelector("#wind-speed");
const forecastRow = document.querySelector("#forecast-row");
const favoriteButton = document.querySelector("#favorite-button");
const favoriteList = document.querySelector("#favorite-list");
const chartCanvas = document.querySelector("#temperature-chart");
const themeToggle = document.querySelector("#theme-toggle");
const dailyRange = document.querySelector("#daily-range");
const sunriseTime = document.querySelector("#sunrise-time");
const sunTrackCard = document.querySelector("#sun-track-card");
const sunTrackStatus = document.querySelector("#sun-track-status");
const sunTrackSunriseTime = document.querySelector("#sun-track-sunrise-time");
const sunTrackSunsetTime = document.querySelector("#sun-track-sunset-time");
const sunTrackFill = document.querySelector("#sun-track-fill");
const sunTrackDot = document.querySelector("#sun-track-dot");
const sunTrackDotLabel = document.querySelector("#sun-track-dot-label");
const aqiCard = document.querySelector("#aqi-card");
const aqiValue = document.querySelector("#aqi-value");
const aqiLevel = document.querySelector("#aqi-level");
const aqiTip = document.querySelector("#aqi-tip");
const uviCard = document.querySelector("#uvi-card");
const uviValue = document.querySelector("#uvi-value");
const uviLevel = document.querySelector("#uvi-level");
const uviTip = document.querySelector("#uvi-tip");

let temperatureChart = null;
let currentCity = null;
let searchCandidates = [];
let favorites = loadJson(favoritesKey, []);
let searchDebounceTimer = null;
let searchRequestId = 0;
let refreshTimer = null;
let isLoading = false;
let lastWeatherAnimationCode = null;
let activeWeatherAnimationUrl = null;

const districtCorrections = {
  "潮南": {
    name: "潮南区",
    district: "潮南区",
    admin2: "汕头市",
    admin1: "广东省",
    country: "中国",
    latitude: 23.2503,
    longitude: 116.4331,
    timezone: "Asia/Shanghai"
  },
  "潮南区": {
    name: "潮南区",
    district: "潮南区",
    admin2: "汕头市",
    admin1: "广东省",
    country: "中国",
    latitude: 23.2503,
    longitude: 116.4331,
    timezone: "Asia/Shanghai"
  }
};

const weatherCodes = {
  0: "晴朗",
  1: "大部晴朗",
  2: "局部多云",
  3: "阴天",
  45: "有雾",
  48: "雾凇",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "较强毛毛雨",
  56: "冻毛毛雨",
  57: "较强冻毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "强冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "阵雨",
  81: "较强阵雨",
  82: "强阵雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷暴",
  96: "雷暴伴小冰雹",
  99: "雷暴伴强冰雹"
};

function loadJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setStatus(message, type = "info") {
  statusBar.textContent = message;
  statusBar.classList.remove("error", "loading", "success");
  if (type !== "info") {
    statusBar.classList.add(type);
  }
}

// === IOS POLISH: SKELETON LOADING ===
function showSkeleton() {
  if (!weatherMain) return;
  weatherMain.innerHTML = `
    <div class="status-bar" id="status-bar">正在加载天气数据...</div>
    <section class="current-grid card-enter">
      <article class="skeleton-card">
        <div class="skeleton-row">
          <div>
            <div class="skeleton-block small" style="width: 80px;"></div>
            <div class="skeleton-block large" style="width: 160px; height: 36px; margin-top: 6px;"></div>
            <div class="skeleton-block medium" style="width: 100px; height: 20px; margin-top: 6px;"></div>
          </div>
          <div class="skeleton-block circle"></div>
        </div>
        <div class="skeleton-block large" style="width: 140px; height: 80px; margin: 20px auto 0;"></div>
        <div class="skeleton-block small" style="width: 120px; margin: 12px auto;"></div>
        <div class="skeleton-grid" style="margin-top: 16px;">
          <div class="skeleton-block"></div>
          <div class="skeleton-block"></div>
          <div class="skeleton-block"></div>
        </div>
      </article>
    </section>
    <section class="sun-track-card card-enter card-enter-delay-1">
      <div class="skeleton-row" style="margin-bottom: 10px;">
        <div class="skeleton-block small" style="width: 100px;"></div>
        <div class="skeleton-block small" style="width: 60px;"></div>
      </div>
      <div class="skeleton-block large" style="height: 40px;"></div>
    </section>
    <section class="insight-grid">
      <article class="skeleton-card card-enter card-enter-delay-2" style="padding: 16px;">
        <div class="skeleton-row" style="margin-bottom: 10px;">
          <div class="skeleton-block small" style="width: 60px;"></div>
          <div class="skeleton-block circle" style="width: 32px; height: 32px;"></div>
        </div>
        <div class="skeleton-row" style="margin-bottom: 8px;">
          <div class="skeleton-block large" style="width: 60px; height: 40px;"></div>
          <div class="skeleton-block small" style="width: 60px;"></div>
        </div>
        <div class="skeleton-block small" style="height: 10px;"></div>
        <div class="skeleton-block small" style="height: 14px; margin-top: 8px;"></div>
      </article>
      <article class="skeleton-card card-enter card-enter-delay-3" style="padding: 16px;">
        <div class="skeleton-row" style="margin-bottom: 10px;">
          <div class="skeleton-block small" style="width: 60px;"></div>
          <div class="skeleton-block circle" style="width: 32px; height: 32px;"></div>
        </div>
        <div class="skeleton-row" style="margin-bottom: 8px;">
          <div class="skeleton-block large" style="width: 60px; height: 40px;"></div>
          <div class="skeleton-block small" style="width: 60px;"></div>
        </div>
        <div class="skeleton-block small" style="height: 14px; margin-top: 8px;"></div>
      </article>
    </section>
    <section class="forecast-section card-enter card-enter-delay-4">
      <div class="skeleton-row" style="margin-bottom: 14px;">
        <div>
          <div class="skeleton-block small" style="width: 80px;"></div>
          <div class="skeleton-block medium" style="width: 120px; margin-top: 4px;"></div>
        </div>
      </div>
      <div class="forecast-row">
        ${Array.from({ length: 5 }).map(() => `
          <article class="skeleton-card" style="width: 88px; padding: 12px; text-align: center;">
            <div class="skeleton-block small" style="width: 100%; height: 18px;"></div>
            <div class="skeleton-block circle" style="width: 36px; height: 36px; margin: 8px auto;"></div>
            <div class="skeleton-block small" style="width: 60%; height: 16px; margin: 4px auto;"></div>
            <div class="skeleton-block small" style="width: 80%; height: 16px; margin-top: 4px;"></div>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="chart-section card-enter card-enter-delay-5">
      <div class="skeleton-row" style="margin-bottom: 14px;">
        <div>
          <div class="skeleton-block small" style="width: 80px;"></div>
          <div class="skeleton-block medium" style="width: 120px; margin-top: 4px;"></div>
        </div>
        <div class="skeleton-block small" style="width: 40px;"></div>
      </div>
      <div class="skeleton-block large" style="height: 150px;"></div>
    </section>
  `;
}

function triggerCardEntryAnimations() {
  if (!weatherMain) return;
  const cards = weatherMain.querySelectorAll(".current-card, .sun-track-card, .insight-card, .forecast-section, .chart-section");
  cards.forEach((card, index) => {
    card.classList.remove("card-enter", "card-enter-delay-1", "card-enter-delay-2", "card-enter-delay-3", "card-enter-delay-4", "card-enter-delay-5");
    card.offsetHeight;
    card.classList.add("card-enter");
    if (index > 0) {
      card.classList.add(`card-enter-delay-${Math.min(index, 5)}`);
    }
  });
}

function triggerErrorShake() {
  if (!weatherMain) return;
  const cards = weatherMain.querySelectorAll(".current-card, .insight-card");
  cards.forEach((card) => {
    card.classList.remove("card-error-shake");
    card.offsetHeight;
    card.classList.add("card-error-shake");
  });
}

function setLoading(loading, silent = false) {
  isLoading = loading;
  document.body.classList.toggle("is-loading", loading && !silent);
  statusBar.classList.toggle("loading", loading && !silent);
  form.querySelector("button[type='submit']").disabled = loading;
  locationButton.disabled = loading;
  favoriteButton.disabled = loading || !currentCity;
  if (loading && !silent) {
    showSkeleton();
  }
}

function buildUrl(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchJson(url, errorMessage) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${errorMessage}（HTTP ${response.status}）`);
    }
    return response.json();
  } catch (error) {
    if (error.message?.startsWith(errorMessage)) {
      throw error;
    }
    throw new Error(`${errorMessage} 请确认本地服务已启动，并检查网络是否可以访问天气 API。`);
  }
}

function normalizeCity(result, source = "search") {
  const adminParts = [
    result.admin4,
    result.admin3,
    result.admin2,
    result.admin1,
    result.country
  ].filter(Boolean);

  return {
    id: `${source}-${result.id || result.name}-${result.latitude}-${result.longitude}`,
    name: result.name,
    district: result.admin4 || result.admin3 || result.admin2 || result.name,
    admin1: result.admin1 || "",
    admin2: result.admin2 || "",
    admin3: result.admin3 || "",
    admin4: result.admin4 || "",
    country: result.country || "",
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone || "auto",
    source,
    displayName: [result.name, ...adminParts.filter((part) => part !== result.name)].join(", ")
  };
}

function normalizeCorrectedDistrict(place, query) {
  return {
    id: `district-${query}-${place.latitude}-${place.longitude}`,
    name: place.name,
    district: place.district,
    admin1: place.admin1 || "",
    admin2: place.admin2 || "",
    admin3: place.admin3 || "",
    admin4: place.admin4 || "",
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone || "auto",
    source: "district",
    displayName: [place.district, place.admin2, place.admin1, place.country].filter(Boolean).join(", ")
  };
}

function getDistrictCorrection(query) {
  const compactQuery = query.replace(/\s+/g, "");
  if (districtCorrections[compactQuery]) {
    return districtCorrections[compactQuery];
  }
  return Object.entries(districtCorrections).find(([name]) => compactQuery.includes(name))?.[1] || null;
}

function normalizeCurrentLocation(position, address) {
  const latitude = Number(position.coords.latitude.toFixed(4));
  const longitude = Number(position.coords.longitude.toFixed(4));
  const administrative = address?.localityInfo?.administrative || [];
  const smallestAdmin = [...administrative].reverse().find((item) => item.name);
  const district = address?.locality || smallestAdmin?.name || address?.city || "当前位置";
  const city = address?.city || "";
  const province = address?.principalSubdivision || "";
  const country = address?.countryName || "";
  const displayName = [district, city, province, country].filter(Boolean).join(", ");

  return {
    id: `current-${latitude}-${longitude}`,
    name: district,
    district,
    admin1: province,
    admin2: city,
    admin3: "",
    admin4: "",
    country,
    latitude,
    longitude,
    timezone: "auto",
    source: "location",
    displayName: displayName || `当前位置 ${latitude}, ${longitude}`
  };
}

function getWeatherText(code) {
  return weatherCodes[code] || "天气数据";
}

// === LOTTIE ANIMATION ===
function getWeatherAnimationType(code) {
  if ([0, 1].includes(code)) {
    return "clear";
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }
  if ([95, 96, 99].includes(code)) {
    return "thunderstorm";
  }
  if ([45, 48].includes(code)) {
    return "fog";
  }
  if ([2, 3].includes(code)) {
    return "clouds";
  }
  return "clouds";
}

function createLottieAnimationData(type) {
  const base = {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 120,
    w: 120,
    h: 120,
    nm: `weather-${type}`,
    ddd: 0,
    assets: [],
    layers: []
  };

  const ellipseLayer = (name, color, position, size, opacity = 100, motion = {}) => ({
    ddd: 0,
    ind: base.layers.length + 1,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: motion.opacity || { a: 0, k: opacity },
      r: motion.rotation || { a: 0, k: 0 },
      p: motion.position || { a: 0, k: position },
      a: { a: 0, k: [0, 0, 0] },
      s: motion.scale || { a: 0, k: [100, 100, 100] }
    },
    shapes: [
      {
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: size }
      },
      {
        ty: "fl",
        c: { a: 0, k: color },
        o: { a: 0, k: 100 }
      }
    ],
    ip: 0,
    op: 120,
    st: 0,
    bm: 0
  });

  const pathLayer = (name, color, path, opacity = 100, widthValue = 6, motion = {}) => ({
    ddd: 0,
    ind: base.layers.length + 1,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: motion.opacity || { a: 0, k: opacity },
      r: motion.rotation || { a: 0, k: 0 },
      p: motion.position || { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: motion.scale || { a: 0, k: [100, 100, 100] }
    },
    shapes: [
      {
        ty: "sh",
        ks: {
          a: 0,
          k: path
        }
      },
      {
        ty: "st",
        c: { a: 0, k: color },
        o: { a: 0, k: 100 },
        w: { a: 0, k: widthValue },
        lc: 2,
        lj: 2
      }
    ],
    ip: 0,
    op: 120,
    st: 0,
    bm: 0
  });

  if (type === "clear") {
    const pulse = {
      a: 1,
      k: [
        { t: 0, s: [88, 88, 100] },
        { t: 40, s: [118, 118, 100] },
        { t: 80, s: [98, 98, 100] },
        { t: 120, s: [88, 88, 100] }
      ]
    };
    const rayRotation = {
      a: 1,
      k: [
        { t: 0, s: [0] },
        { t: 120, s: [90] }
      ]
    };
    base.layers.push(ellipseLayer("sun glow outer", [1, 0.68, 0.18, 1], [60, 60, 0], [82, 82], 24, { scale: pulse }));
    base.layers.push(ellipseLayer("sun glow", [1, 0.72, 0.22, 1], [60, 60, 0], [70, 70], 42, { scale: pulse }));
    base.layers.push(ellipseLayer("sun core", [1, 0.82, 0.28, 1], [60, 60, 0], [42, 42], 100));
    [[60, 8, 60, 24], [60, 96, 60, 112], [8, 60, 24, 60], [96, 60, 112, 60]].forEach(([x1, y1, x2, y2], index) => {
      base.layers.push(pathLayer(`sun ray ${index}`, [1, 0.86, 0.4, 1], {
        i: [[0, 0], [0, 0]],
        o: [[0, 0], [0, 0]],
        v: [[x1, y1], [x2, y2]],
        c: false
      }, 88, 5, {
        opacity: {
          a: 1,
          k: [
            { t: 0, s: [48] },
            { t: 40, s: [100] },
            { t: 80, s: [64] },
            { t: 120, s: [48] }
          ]
        },
        rotation: rayRotation
      }));
    });
    [[38, 38, 48, 48], [82, 38, 72, 48], [38, 82, 48, 72], [82, 82, 72, 72]].forEach(([x1, y1, x2, y2], index) => {
      base.layers.push(pathLayer(`sun ray diag ${index}`, [1, 0.9, 0.5, 1], {
        i: [[0, 0], [0, 0]],
        o: [[0, 0], [0, 0]],
        v: [[x1, y1], [x2, y2]],
        c: false
      }, 60, 4, {
        opacity: {
          a: 1,
          k: [
            { t: 0, s: [24] },
            { t: 40, s: [72] },
            { t: 80, s: [36] },
            { t: 120, s: [24] }
          ]
        },
        rotation: rayRotation
      }));
    });
  } else if (type === "rain") {
    base.layers.push(ellipseLayer("cloud body", [0.78, 0.88, 1, 1], [60, 46, 0], [76, 36], 92, {
      position: {
        a: 1,
        k: [
          { t: 0, s: [56, 46, 0] },
          { t: 60, s: [64, 46, 0] },
          { t: 120, s: [56, 46, 0] }
        ]
      }
    }));
    base.layers.push(ellipseLayer("cloud shadow", [0.6, 0.72, 0.9, 1], [60, 52, 0], [60, 22], 40, {
      position: {
        a: 1,
        k: [
          { t: 0, s: [56, 52, 0] },
          { t: 60, s: [64, 52, 0] },
          { t: 120, s: [56, 52, 0] }
        ]
      }
    }));
    [[36, 70], [50, 76], [64, 70], [78, 76], [44, 82], [70, 82]].forEach(([x, y], index) => {
      base.layers.push(pathLayer(`rain ${index}`, [0.45, 0.78, 1, 1], {
        i: [[0, 0], [0, 0]],
        o: [[0, 0], [0, 0]],
        v: [[x, y], [x - 6, y + 20]],
        c: false
      }, 88, 4, {
        position: {
          a: 1,
          k: [
            { t: 0, s: [0, -10, 0] },
            { t: 30, s: [0, 8, 0] },
            { t: 60, s: [0, 18, 0] },
            { t: 90, s: [0, 4, 0] },
            { t: 120, s: [0, -10, 0] }
          ]
        },
        opacity: {
          a: 1,
          k: [
            { t: 0, s: [20] },
            { t: 20, s: [95] },
            { t: 50, s: [80] },
            { t: 80, s: [40] },
            { t: 120, s: [20] }
          ]
        }
      }));
    });
  } else if (type === "snow") {
    base.layers.push(ellipseLayer("cloud body", [0.88, 0.94, 1, 1], [60, 42, 0], [74, 32], 84));
    [[36, 72], [54, 82], [72, 72], [84, 80], [42, 88], [66, 92]].forEach(([x, y], index) => {
      const rotDir = index % 2 === 0 ? 1 : -1;
      base.layers.push(ellipseLayer(`snow ${index}`, [1, 1, 1, 1], [x, y, 0], [7 + (index % 3), 7 + (index % 3)], 92, {
        position: {
          a: 1,
          k: [
            { t: 0, s: [x - 4, y - 14, 0] },
            { t: 40, s: [x + 5, y + 4, 0] },
            { t: 80, s: [x - 2, y + 14, 0] },
            { t: 120, s: [x - 4, y - 14, 0] }
          ]
        },
        rotation: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: 120, s: [180 * rotDir] }
          ]
        },
        opacity: {
          a: 1,
          k: [
            { t: 0, s: [40] },
            { t: 30, s: [100] },
            { t: 90, s: [70] },
            { t: 120, s: [40] }
          ]
        }
      }));
    });
  } else if (type === "thunderstorm") {
    base.layers.push(ellipseLayer("storm cloud back", [0.5, 0.56, 0.78, 1], [60, 42, 0], [84, 38], 88, {
      position: {
        a: 1,
        k: [
          { t: 0, s: [58, 42, 0] },
          { t: 20, s: [62, 40, 0] },
          { t: 40, s: [58, 44, 0] },
          { t: 60, s: [62, 42, 0] },
          { t: 80, s: [58, 40, 0] },
          { t: 120, s: [58, 42, 0] }
        ]
      }
    }));
    base.layers.push(ellipseLayer("storm cloud front", [0.62, 0.68, 0.86, 1], [60, 46, 0], [76, 34], 94, {
      position: {
        a: 1,
        k: [
          { t: 0, s: [62, 46, 0] },
          { t: 20, s: [58, 44, 0] },
          { t: 40, s: [62, 48, 0] },
          { t: 60, s: [58, 46, 0] },
          { t: 80, s: [62, 44, 0] },
          { t: 120, s: [62, 46, 0] }
        ]
      }
    }));
    base.layers.push(pathLayer("lightning", [1, 0.83, 0.25, 1], {
      i: [[0, 0], [0, 0], [0, 0], [0, 0]],
      o: [[0, 0], [0, 0], [0, 0], [0, 0]],
      v: [[64, 58], [48, 82], [62, 80], [52, 110]],
      c: false
    }, 100, 7, {
      opacity: {
        a: 1,
        k: [
          { t: 0, s: [16] },
          { t: 12, s: [100] },
          { t: 22, s: [40] },
          { t: 32, s: [100] },
          { t: 44, s: [20] },
          { t: 72, s: [100] },
          { t: 84, s: [36] },
          { t: 120, s: [16] }
        ]
      },
      scale: {
        a: 1,
        k: [
          { t: 0, s: [92, 92, 100] },
          { t: 12, s: [108, 108, 100] },
          { t: 32, s: [96, 96, 100] },
          { t: 72, s: [110, 110, 100] },
          { t: 120, s: [92, 92, 100] }
        ]
      }
    }));
    base.layers.push(ellipseLayer("flash glow", [1, 0.9, 0.5, 1], [60, 80, 0], [100, 100], 0, {
      opacity: {
        a: 1,
        k: [
          { t: 0, s: [0] },
          { t: 12, s: [28] },
          { t: 24, s: [0] },
          { t: 32, s: [22] },
          { t: 44, s: [0] },
          { t: 72, s: [32] },
          { t: 84, s: [0] },
          { t: 120, s: [0] }
        ]
      }
    }));
  } else if (type === "fog") {
    [[44, 52, 64], [68, 58, 80], [52, 68, 70], [76, 48, 60]].forEach(([x, y, w], index) => {
      base.layers.push(ellipseLayer(`fog layer ${index}`, [0.82, 0.86, 0.92, 1], [x, y, 0], [w, 20], 30 + index * 8, {
        position: {
          a: 1,
          k: [
            { t: 0, s: [x - 8, y, 0] },
            { t: 60, s: [x + 8, y, 0] },
            { t: 120, s: [x - 8, y, 0] }
          ]
        },
        opacity: {
          a: 1,
          k: [
            { t: 0, s: [20 + index * 6] },
            { t: 40, s: [50 + index * 8] },
            { t: 80, s: [30 + index * 6] },
            { t: 120, s: [20 + index * 6] }
          ]
        },
        scale: {
          a: 1,
          k: [
            { t: 0, s: [90, 100, 100] },
            { t: 60, s: [110, 100, 100] },
            { t: 120, s: [90, 100, 100] }
          ]
        }
      }));
    });
  } else {
    base.layers.push(ellipseLayer("cloud left", [0.86, 0.91, 1, 1], [47, 58, 0], [58, 34], 86, {
      position: {
        a: 1,
        k: [
          { t: 0, s: [43, 58, 0] },
          { t: 60, s: [51, 58, 0] },
          { t: 120, s: [43, 58, 0] }
        ]
      }
    }));
    base.layers.push(ellipseLayer("cloud right", [0.76, 0.84, 0.96, 1], [70, 53, 0], [68, 38], 78, {
      position: {
        a: 1,
        k: [
          { t: 0, s: [74, 53, 0] },
          { t: 60, s: [66, 53, 0] },
          { t: 120, s: [74, 53, 0] }
        ]
      }
    }));
    base.layers.push(ellipseLayer("cloud accent", [0.7, 0.8, 0.95, 1], [58, 64, 0], [48, 24], 52, {
      position: {
        a: 1,
        k: [
          { t: 0, s: [62, 64, 0] },
          { t: 60, s: [54, 64, 0] },
          { t: 120, s: [62, 64, 0] }
        ]
      }
    }));
  }

  return base;
}

function renderWeatherAnimation(weatherCode) {
  if (!weatherAnimation) {
    return;
  }

  lastWeatherAnimationCode = weatherCode;
  const type = getWeatherAnimationType(weatherCode);
  const fallbackMarkup = `<span class="weather-animation-fallback weather-anim-${type}" aria-hidden="true"></span>`;
  weatherAnimation.innerHTML = fallbackMarkup;
}

globalThis.customElements?.whenDefined?.("lottie-player").then(() => {
  if (lastWeatherAnimationCode !== null) {
    renderWeatherAnimation(lastWeatherAnimationCode);
  }
}).catch(() => {});

// === UI REFACTOR START ===
function getWeatherIcon(code) {
  if ([0, 1].includes(code)) {
    return "☀";
  }
  if ([2, 3].includes(code)) {
    return "☁";
  }
  if ([45, 48].includes(code)) {
    return "≋";
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "☔";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "❄";
  }
  if ([95, 96, 99].includes(code)) {
    return "⚡";
  }
  return "◌";
}

function formatClock(timeText) {
  if (!timeText) {
    return "--:--";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(timeText));
}

function getStoredThemeMode() {
  const raw = readStoredValue(themeModeKey);
  let stored = raw;
  try {
    stored = raw ? JSON.parse(raw) : "auto";
  } catch {
    stored = raw;
  }
  return stored === "day" || stored === "night" ? stored : "auto";
}

function getAutoThemeMode(weather) {
  const now = new Date();
  const sunrise = weather?.daily?.sunrise?.[0] ? new Date(weather.daily.sunrise[0]) : null;
  const sunset = weather?.daily?.sunset?.[0] ? new Date(weather.daily.sunset[0]) : null;
  if (sunrise && sunset) {
    return now >= sunrise && now < sunset ? "day" : "night";
  }
  const hour = now.getHours();
  return hour >= 6 && hour < 19 ? "day" : "night";
}

function applyThemeMode(mode) {
  document.body.dataset.mode = mode;
  if (themeToggle) {
    themeToggle.textContent = mode === "night" ? "☀" : "☾";
    themeToggle.setAttribute("aria-label", mode === "night" ? "切换白天模式" : "切换深色模式");
  }
}

function updateThemeMode(weather) {
  const stored = getStoredThemeMode();
  applyThemeMode(stored === "auto" ? getAutoThemeMode(weather) : stored);
}
// === UI REFACTOR END ===

function getWeatherTheme(code) {
  if ([0, 1].includes(code)) {
    return "sunny";
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rainy";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snowy";
  }
  if ([95, 96, 99].includes(code)) {
    return "stormy";
  }
  if ([45, 48].includes(code)) {
    return "foggy";
  }
  if ([2, 3].includes(code)) {
    return "cloudy";
  }
  return "default";
}

function applyWeatherTheme(weatherCode) {
  const theme = getWeatherTheme(weatherCode);
  document.body.dataset.weather = theme;
  weatherBackgroundEffect.setWeather(theme);
}

// === WEATHER BACKGROUND EFFECT ===
const weatherBackgroundEffect = (() => {
  const canvas = document.querySelector("#weather-effect-canvas");
  const context = canvas?.getContext("2d");
  const supportedModes = new Set(["sunny", "rainy", "snowy", "cloudy", "stormy", "foggy"]);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  if (!canvas || !context || !window.requestAnimationFrame) {
    return {
      setWeather() {}
    };
  }

  let width = 0;
  let height = 0;
  let deviceScale = 1;
  let mode = "default";
  let particles = [];
  let animationFrame = null;
  let tick = 0;
  let lightningFlash = 0;
  let lightningCooldown = 0;

  const warmPalette = {
    sunny: { primary: "255, 210, 120", secondary: "255, 180, 90", glow: "255, 230, 160" },
    rainy: { primary: "170, 195, 225", secondary: "140, 170, 205", glow: "200, 215, 235" },
    snowy: { primary: "240, 230, 245", secondary: "210, 200, 225", glow: "250, 245, 255" },
    cloudy: { primary: "220, 208, 195", secondary: "190, 178, 165", glow: "235, 225, 215" },
    stormy: { primary: "150, 140, 180", secondary: "120, 110, 150", glow: "180, 170, 200" },
    foggy: { primary: "210, 200, 188", secondary: "180, 170, 158", glow: "225, 218, 210" }
  };

  const nightPalette = {
    sunny: { primary: "140, 150, 210", secondary: "110, 120, 180", glow: "160, 170, 230" },
    rainy: { primary: "80, 90, 140", secondary: "55, 65, 110", glow: "100, 110, 160" },
    snowy: { primary: "160, 170, 210", secondary: "130, 140, 180", glow: "180, 190, 230" },
    cloudy: { primary: "100, 105, 140", secondary: "70, 75, 110", glow: "120, 125, 160" },
    stormy: { primary: "70, 65, 110", secondary: "45, 40, 80", glow: "90, 85, 130" },
    foggy: { primary: "95, 90, 125", secondary: "65, 60, 95", glow: "115, 105, 145" }
  };

  function getPalette() {
    return isNightMode() ? nightPalette[mode] || nightPalette.sunny : warmPalette[mode] || warmPalette.sunny;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function isNightMode() {
    return document.body.dataset.mode === "night";
  }

  function getEffectMode(weatherMode) {
    return supportedModes.has(weatherMode) ? weatherMode : "default";
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * deviceScale;
    canvas.height = height * deviceScale;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    seedParticles();
  }

  function clearCanvas() {
    context.clearRect(0, 0, width, height);
  }

  function createSunnyParticle() {
    return {
      x: randomBetween(0, width),
      y: randomBetween(0, height),
      radius: randomBetween(2, 5.5),
      speed: randomBetween(0.5, 1.5),
      drift: randomBetween(-0.3, 0.3),
      alpha: randomBetween(0.45, 0.9),
      phase: randomBetween(0, Math.PI * 2)
    };
  }

  function createRainParticle() {
    return {
      x: randomBetween(0, width),
      y: randomBetween(-height, height),
      length: randomBetween(18, 40),
      speed: randomBetween(5.5, 10),
      slant: randomBetween(-5, -1.5),
      alpha: randomBetween(0.35, 0.65)
    };
  }

  function createSnowParticle() {
    return {
      x: randomBetween(0, width),
      y: randomBetween(-height, height),
      radius: randomBetween(2, 5.5),
      speed: randomBetween(1, 2.5),
      sway: randomBetween(0.6, 2.2),
      alpha: randomBetween(0.55, 0.95),
      phase: randomBetween(0, Math.PI * 2)
    };
  }

  function createCloudParticle() {
    return {
      x: randomBetween(-width * 0.35, width),
      y: randomBetween(20, height * 0.72),
      width: randomBetween(260, 480),
      height: randomBetween(85, 160),
      speed: randomBetween(0.06, 0.16),
      blur: randomBetween(30, 55),
      alpha: randomBetween(0.1, 0.2)
    };
  }

  function createStormParticle() {
    return {
      x: randomBetween(0, width),
      y: randomBetween(-height, height),
      length: randomBetween(28, 60),
      speed: randomBetween(8, 12),
      slant: randomBetween(-7, -2.5),
      alpha: randomBetween(0.4, 0.7)
    };
  }

  function createFogParticle() {
    return {
      x: randomBetween(-width * 0.3, width * 1.1),
      y: randomBetween(height * 0.1, height * 0.85),
      width: randomBetween(320, 580),
      height: randomBetween(105, 210),
      speed: randomBetween(0.03, 0.09),
      blur: randomBetween(38, 70),
      alpha: randomBetween(0.1, 0.22),
      phase: randomBetween(0, Math.PI * 2)
    };
  }

  function seedParticles() {
    const area = width * height;
    const factories = {
      sunny: {
        count: Math.min(45, Math.max(20, Math.floor(area / 38000))),
        create: createSunnyParticle
      },
      rainy: {
        count: Math.min(110, Math.max(38, Math.floor(area / 15000))),
        create: createRainParticle
      },
      snowy: {
        count: Math.min(85, Math.max(30, Math.floor(area / 18000))),
        create: createSnowParticle
      },
      cloudy: {
        count: Math.min(7, Math.max(4, Math.floor(width / 230))),
        create: createCloudParticle
      },
      stormy: {
        count: Math.min(150, Math.max(55, Math.floor(area / 10000))),
        create: createStormParticle
      },
      foggy: {
        count: Math.min(11, Math.max(5, Math.floor(width / 200))),
        create: createFogParticle
      }
    };

    if (!factories[mode]) {
      particles = [];
      clearCanvas();
      return;
    }

    particles = Array.from({ length: factories[mode].count }, factories[mode].create);
    lightningFlash = 0;
    lightningCooldown = Math.floor(randomBetween(70, 180));
  }

  function drawSunny() {
    const pal = getPalette();

    context.save();
    context.globalCompositeOperation = "screen";
    const gradient1 = context.createRadialGradient(
      width * 0.15 + Math.sin(tick * 0.005) * 20,
      height * 0.08,
      0,
      width * 0.15,
      height * 0.08,
      Math.max(width, height) * 0.72
    );
    gradient1.addColorStop(0, `rgba(${pal.glow}, 0.28)`);
    gradient1.addColorStop(0.5, `rgba(${pal.secondary}, 0.11)`);
    gradient1.addColorStop(1, `rgba(${pal.secondary}, 0)`);
    context.fillStyle = gradient1;
    context.fillRect(0, 0, width, height);

    const gradient2 = context.createRadialGradient(
      width * 0.82 + Math.sin(tick * 0.003) * 25,
      height * 0.48,
      0,
      width * 0.82,
      height * 0.48,
      Math.max(width, height) * 0.52
    );
    gradient2.addColorStop(0, `rgba(${pal.glow}, 0.14)`);
    gradient2.addColorStop(0.6, `rgba(${pal.primary}, 0.05)`);
    gradient2.addColorStop(1, `rgba(${pal.primary}, 0)`);
    context.fillStyle = gradient2;
    context.fillRect(0, 0, width, height);
    context.restore();

    particles.forEach((p) => {
      p.y -= p.speed;
      p.x += p.drift + Math.sin(tick * 0.01 + p.phase) * 0.25;

      if (p.y < -10 || p.x < -15 || p.x > width + 15) {
        Object.assign(p, createSunnyParticle(), { y: height + randomBetween(5, 30) });
      }

      const pulse = 0.55 + Math.sin(tick * 0.022 + p.phase) * 0.45;
      const alpha = p.alpha * pulse;

      context.save();
      context.globalCompositeOperation = "screen";
      const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5);
      glow.addColorStop(0, `rgba(${pal.glow}, ${alpha * 0.65})`);
      glow.addColorStop(0.5, `rgba(${pal.primary}, ${alpha * 0.3})`);
      glow.addColorStop(1, `rgba(${pal.primary}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(${pal.glow}, ${alpha})`;
      context.beginPath();
      context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  function drawRain() {
    const pal = getPalette();

    context.save();
    context.globalCompositeOperation = "screen";
    const gradient = context.createRadialGradient(
      width * 0.25,
      height * 0.12,
      0,
      width * 0.25,
      height * 0.12,
      Math.max(width, height) * 0.62
    );
    gradient.addColorStop(0, `rgba(${pal.glow}, 0.17)`);
    gradient.addColorStop(0.5, `rgba(${pal.secondary}, 0.075)`);
    gradient.addColorStop(1, `rgba(${pal.secondary}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();

    context.lineCap = "round";
    context.lineWidth = 1;
    particles.forEach((p) => {
      p.y += p.speed;
      p.x += p.slant * 0.09;

      if (p.y > height + p.length) {
        Object.assign(p, createRainParticle(), { y: randomBetween(-60, -5) });
      }

      context.save();
      context.globalCompositeOperation = "screen";
      context.strokeStyle = `rgba(${pal.primary}, ${p.alpha})`;
      context.beginPath();
      context.moveTo(p.x, p.y);
      context.lineTo(p.x + p.slant, p.y + p.length);
      context.stroke();
      context.restore();
    });
  }

  function drawSnow() {
    const pal = getPalette();

    context.save();
    context.globalCompositeOperation = "screen";
    const gradient = context.createRadialGradient(
      width * 0.32,
      height * 0.16,
      0,
      width * 0.32,
      height * 0.16,
      Math.max(width, height) * 0.68
    );
    gradient.addColorStop(0, `rgba(${pal.glow}, 0.18)`);
    gradient.addColorStop(0.5, `rgba(${pal.secondary}, 0.08)`);
    gradient.addColorStop(1, `rgba(${pal.secondary}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();

    particles.forEach((p) => {
      p.y += p.speed;
      p.x += Math.sin((tick + p.y) * 0.016) * p.sway * 0.22;

      if (p.y > height + 8) {
        Object.assign(p, createSnowParticle(), { y: randomBetween(-40, -5) });
      }

      const alpha = p.alpha;
      context.save();
      context.globalCompositeOperation = "screen";
      const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.8);
      glow.addColorStop(0, `rgba(${pal.glow}, ${alpha * 0.75})`);
      glow.addColorStop(1, `rgba(${pal.glow}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(${pal.glow}, ${alpha})`;
      context.beginPath();
      context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  function drawClouds() {
    const pal = getPalette();

    context.save();
    context.globalCompositeOperation = "screen";
    const gradient = context.createRadialGradient(
      width * 0.5 + Math.sin(tick * 0.003) * 30,
      height * 0.26,
      0,
      width * 0.5,
      height * 0.26,
      Math.max(width, height) * 0.72
    );
    gradient.addColorStop(0, `rgba(${pal.glow}, 0.15)`);
    gradient.addColorStop(0.5, `rgba(${pal.secondary}, 0.065)`);
    gradient.addColorStop(1, `rgba(${pal.secondary}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();

    particles.forEach((p) => {
      p.x += p.speed;
      if (p.x > width + p.width) {
        Object.assign(p, createCloudParticle(), { x: -p.width - randomBetween(15, 80) });
      }

      context.save();
      context.globalCompositeOperation = "screen";
      context.filter = `blur(${p.blur}px)`;
      context.fillStyle = `rgba(${pal.glow}, ${p.alpha})`;
      context.beginPath();
      context.ellipse(p.x, p.y, p.width * 0.5, p.height * 0.45, 0, 0, Math.PI * 2);
      context.ellipse(p.x + p.width * 0.28, p.y + 8, p.width * 0.38, p.height * 0.38, 0, 0, Math.PI * 2);
      context.ellipse(p.x - p.width * 0.24, p.y + 10, p.width * 0.34, p.height * 0.34, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  function drawStorm() {
    const pal = getPalette();

    if (lightningCooldown > 0) {
      lightningCooldown -= 1;
    } else if (lightningFlash <= 0 && Math.random() < 0.022) {
      lightningFlash = 1;
      lightningCooldown = Math.floor(randomBetween(70, 180));
    }

    context.save();
    context.globalCompositeOperation = "screen";
    const gradient = context.createRadialGradient(
      width * 0.26,
      height * 0.12,
      0,
      width * 0.26,
      height * 0.12,
      Math.max(width, height) * 0.62
    );
    gradient.addColorStop(0, `rgba(${pal.glow}, 0.2)`);
    gradient.addColorStop(0.5, `rgba(${pal.secondary}, 0.09)`);
    gradient.addColorStop(1, `rgba(${pal.secondary}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();

    if (lightningFlash > 0) {
      const flashAlpha = lightningFlash * 0.18;
      context.fillStyle = `rgba(255, 245, 210, ${flashAlpha})`;
      context.fillRect(0, 0, width, height);
      lightningFlash -= 0.07;
      if (lightningFlash < 0) lightningFlash = 0;
    }

    context.lineCap = "round";
    context.lineWidth = 1.2;
    particles.forEach((p) => {
      p.y += p.speed;
      p.x += p.slant * 0.11;

      if (p.y > height + p.length) {
        Object.assign(p, createStormParticle(), { y: randomBetween(-60, -5) });
      }

      context.save();
      context.globalCompositeOperation = "screen";
      context.strokeStyle = `rgba(${pal.primary}, ${p.alpha})`;
      context.beginPath();
      context.moveTo(p.x, p.y);
      context.lineTo(p.x + p.slant, p.y + p.length);
      context.stroke();
      context.restore();
    });
  }

  function drawFog() {
    const pal = getPalette();

    context.save();
    context.globalCompositeOperation = "screen";
    const gradient = context.createRadialGradient(
      width * 0.45 + Math.sin(tick * 0.002) * 25,
      height * 0.38,
      0,
      width * 0.45,
      height * 0.38,
      Math.max(width, height) * 0.82
    );
    gradient.addColorStop(0, `rgba(${pal.glow}, 0.13)`);
    gradient.addColorStop(0.5, `rgba(${pal.secondary}, 0.055)`);
    gradient.addColorStop(1, `rgba(${pal.secondary}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();

    particles.forEach((p) => {
      p.x += p.speed;
      if (p.x > width + p.width * 0.5) {
        Object.assign(p, createFogParticle(), { x: -p.width });
      }

      const wobble = Math.sin(tick * 0.004 + p.phase) * 18;
      context.save();
      context.globalCompositeOperation = "screen";
      context.filter = `blur(${p.blur}px)`;
      context.fillStyle = `rgba(${pal.glow}, ${p.alpha})`;
      context.beginPath();
      context.ellipse(p.x, p.y + wobble, p.width * 0.5, p.height * 0.4, 0, 0, Math.PI * 2);
      context.ellipse(p.x + p.width * 0.3, p.y + wobble + 6, p.width * 0.36, p.height * 0.34, 0, 0, Math.PI * 2);
      context.ellipse(p.x - p.width * 0.26, p.y + wobble + 8, p.width * 0.32, p.height * 0.3, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  function drawFrame() {
    animationFrame = null;
    if (document.hidden || mode === "default" || reducedMotion?.matches) {
      clearCanvas();
      return;
    }

    tick += 1;
    clearCanvas();

    if (mode === "sunny") drawSunny();
    else if (mode === "rainy") drawRain();
    else if (mode === "snowy") drawSnow();
    else if (mode === "cloudy") drawClouds();
    else if (mode === "stormy") drawStorm();
    else if (mode === "foggy") drawFog();

    animationFrame = window.requestAnimationFrame(drawFrame);
  }

  function stopAnimation() {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    clearCanvas();
  }

  function startAnimation() {
    if (!animationFrame && mode !== "default" && !reducedMotion?.matches) {
      animationFrame = window.requestAnimationFrame(drawFrame);
    }
  }

  function setWeather(weatherMode) {
    const nextMode = getEffectMode(weatherMode);
    if (nextMode === mode) {
      startAnimation();
      return;
    }

    mode = nextMode;
    seedParticles();

    if (mode === "default" || reducedMotion?.matches) {
      stopAnimation();
      return;
    }

    startAnimation();
  }

  const observer = new MutationObserver(() => {
    setWeather(document.body.dataset.weather);
  });

  resizeCanvas();
  setWeather(document.body.dataset.weather || "default");
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-weather"] });
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });
  reducedMotion?.addEventListener?.("change", () => {
    if (reducedMotion.matches) stopAnimation();
    else startAnimation();
  });

  return {
    setWeather
  };
})();

function roundValue(value) {
  return Number.isFinite(value) ? Math.round(value) : "--";
}

// === AQI & UVI START ===
function getAqiMeta(aqi, scale = "owm") {
  if (scale === "us") {
    const usLevels = [
      { max: 50, label: "优", tip: "适合户外活动", color: "#22a06b", progress: "10%" },
      { max: 100, label: "良", tip: "适合短时户外活动", color: "#7cb342", progress: "30%" },
      { max: 150, label: "轻度污染", tip: "敏感人群减少久留户外", color: "#f2c94c", progress: "52%" },
      { max: 200, label: "中度污染", tip: "建议减少户外运动", color: "#f2994a", progress: "74%" },
      { max: Infinity, label: "重度污染", tip: "外出建议佩戴口罩", color: "#d64545", progress: "94%" }
    ];
    return usLevels.find((item) => aqi <= item.max);
  }

  const levels = [
    { max: 1, label: "优", tip: "适合户外活动", color: "#22a06b", progress: "10%" },
    { max: 2, label: "良", tip: "适合短时户外活动", color: "#7cb342", progress: "30%" },
    { max: 3, label: "轻度污染", tip: "敏感人群减少久留户外", color: "#f2c94c", progress: "52%" },
    { max: 4, label: "中度污染", tip: "建议减少户外运动", color: "#f2994a", progress: "74%" },
    { max: 5, label: "重度污染", tip: "外出建议佩戴口罩", color: "#d64545", progress: "94%" }
  ];
  return levels.find((item) => aqi <= item.max) || levels[levels.length - 1];
}

function getUviMeta(uvi) {
  if (uvi < 3) {
    return { label: "低", tip: "外出建议佩戴太阳镜" };
  }
  if (uvi < 6) {
    return { label: "中等", tip: "外出建议涂抹防晒" };
  }
  if (uvi < 8) {
    return { label: "高", tip: "减少正午户外停留" };
  }
  if (uvi < 11) {
    return { label: "很高", tip: "外出注意遮阳防晒" };
  }
  return { label: "极高", tip: "尽量避免长时间暴晒" };
}

function getNestedValue(source, paths) {
  for (const path of paths) {
    const value = path.reduce((current, key) => current?.[key], source);
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }
  return null;
}

function resetAirAndUv() {
  aqiValue.textContent = "--";
  aqiLevel.textContent = "暂无数据";
  aqiTip.textContent = "适合户外活动";
  aqiCard.style.setProperty("--aqi-accent", "var(--aqi-good)");
  aqiCard.style.setProperty("--aqi-progress", "0%");
  aqiCard.classList.add("is-muted");

  uviValue.textContent = "--";
  uviLevel.textContent = "暂无数据";
  uviTip.textContent = "外出建议佩戴太阳镜";
  uviCard.classList.add("is-muted");
}

function extractOpenWeatherAirAndUv(data) {
  return {
    aqi: getNestedValue(data, [
      ["current", "air_quality", "aqi"],
      ["current", "air_quality", "main", "aqi"],
      ["current", "air_pollution", "aqi"],
      ["current", "air_pollution", "main", "aqi"],
      ["air_quality", "aqi"],
      ["air_quality", "main", "aqi"],
      ["air_pollution", "aqi"],
      ["air_pollution", "main", "aqi"],
      ["air_pollution", "list", 0, "main", "aqi"],
      ["list", 0, "main", "aqi"]
    ]),
    uvi: getNestedValue(data, [["current", "uvi"], ["current", "uv_index"], ["uvi"]]),
    aqiScale: "owm"
  };
}

function getWeatherUvi(weather) {
  const currentUvi = getNestedValue(weather, [["current", "uv_index"], ["current", "uvi"]]);
  const dailyMax = getNestedValue(weather, [["daily", "uv_index_max", 0]]);
  if (Number.isFinite(dailyMax) && dailyMax > 0) {
    return dailyMax;
  }

  const times = weather?.hourly?.time || [];
  const values = weather?.hourly?.uv_index || [];
  const now = Date.now();
  const index = times.findIndex((time) => new Date(time).getTime() >= now - 60 * 60 * 1000);
  const startIndex = index >= 0 ? index : 0;
  const next24Values = values
    .slice(startIndex, startIndex + 24)
    .map(Number)
    .filter(Number.isFinite);
  const next24Max = next24Values.length > 0 ? Math.max(...next24Values) : null;
  if (Number.isFinite(next24Max) && next24Max > 0) {
    return next24Max;
  }

  return Number.isFinite(currentUvi) ? currentUvi : next24Max;
}

function renderAirAndUvValues({ aqi = null, uvi = null, aqiScale = "owm" }) {
  if (Number.isFinite(aqi)) {
    const meta = getAqiMeta(aqi, aqiScale);
    aqiValue.textContent = Math.round(aqi);
    aqiLevel.textContent = meta.label;
    aqiTip.textContent = meta.tip;
    aqiCard.style.setProperty("--aqi-accent", meta.color);
    aqiCard.style.setProperty("--aqi-progress", meta.progress);
    aqiCard.classList.remove("is-muted");
  }

  if (Number.isFinite(uvi)) {
    const meta = getUviMeta(uvi);
    uviValue.textContent = uvi.toFixed(1);
    uviLevel.textContent = meta.label;
    uviTip.textContent = meta.tip;
    uviCard.classList.remove("is-muted");
  }
}

async function fetchOpenWeatherAirAndUv(city) {
  if (!openWeatherApiKey) {
    return null;
  }

  const url = buildUrl(openWeatherOneCallUrl, {
    lat: city.latitude,
    lon: city.longitude,
    appid: openWeatherApiKey,
    units: "metric",
    lang: "zh_cn",
    exclude: "minutely,hourly,daily,alerts"
  });
  return fetchJson(url, "OpenWeatherMap 扩展数据加载失败。");
}

async function fetchOpenMeteoAqi(city) {
  const url = buildUrl(airQualityUrl, {
    latitude: city.latitude,
    longitude: city.longitude,
    current: "us_aqi",
    timezone: city.timezone || "auto"
  });
  const data = await fetchJson(url, "Open-Meteo 空气质量数据加载失败。");
  return getNestedValue(data, [["current", "us_aqi"]]);
}

async function updateAirAndUv(city, weather) {
  resetAirAndUv();

  let aqi = null;
  let aqiScale = "owm";
  let uvi = getWeatherUvi(weather);

  try {
    const openWeatherData = await fetchOpenWeatherAirAndUv(city);
    if (openWeatherData) {
      const values = extractOpenWeatherAirAndUv(openWeatherData);
      aqi = values.aqi;
      aqiScale = values.aqiScale;
      uvi = Number.isFinite(values.uvi) ? values.uvi : uvi;
    }
  } catch {
    // Keep the Open-Meteo fallbacks below quiet if OpenWeatherMap is unavailable.
  }

  if (!Number.isFinite(aqi)) {
    try {
      aqi = await fetchOpenMeteoAqi(city);
      aqiScale = "us";
    } catch {
      aqi = null;
    }
  }

  renderAirAndUvValues({ aqi, uvi, aqiScale });
}
// === AQI & UVI END ===

// === SUNRISE SUNSET BAR ===
let sunTrackTimer = null;

function resetSunTrack() {
  sunTrackStatus.textContent = "--";
  sunTrackSunriseTime.textContent = "--:--";
  sunTrackSunsetTime.textContent = "--:--";
  sunTrackFill.style.width = "0%";
  sunTrackDot.style.left = "0%";
  sunTrackDotLabel.textContent = "现在";
  sunTrackCard.classList.remove("is-night");
}

function renderSunTrack(daily) {
  window.clearInterval(sunTrackTimer);

  const sunriseStr = daily && daily.sunrise && daily.sunrise[0];
  const sunsetStr = daily && daily.sunset && daily.sunset[0];

  if (!sunriseStr || !sunsetStr) {
    resetSunTrack();
    return;
  }

  const sunrise = new Date(sunriseStr).getTime();
  const sunset = new Date(sunsetStr).getTime();

  sunTrackSunriseTime.textContent = formatClock(sunriseStr);
  sunTrackSunsetTime.textContent = formatClock(sunsetStr);

  function update() {
    const now = Date.now();
    const isNight = now < sunrise || now >= sunset;

    sunTrackCard.classList.toggle("is-night", isNight);

    if (isNight) {
      sunTrackStatus.textContent = "夜间";
      sunTrackStatus.classList.add("is-night");
      sunTrackDotLabel.textContent = "夜间";

      if (now < sunrise) {
        // 日出之前：进度条为空，小球在最左
        sunTrackFill.style.width = "0%";
        sunTrackDot.style.left = "0%";
      } else {
        // 日落之后：进度条满，小球在最右
        sunTrackFill.style.width = "100%";
        sunTrackDot.style.left = "100%";
      }
    } else {
      sunTrackStatus.textContent = "白天";
      sunTrackStatus.classList.remove("is-night");
      sunTrackDotLabel.textContent = "现在";

      const duration = sunset - sunrise;
      const elapsed = now - sunrise;
      const progress = Math.max(0, Math.min(1, elapsed / duration));
      const pct = (progress * 100).toFixed(1);

      sunTrackFill.style.width = pct + "%";
      sunTrackDot.style.left = pct + "%";
    }
  }

  update();
  sunTrackTimer = window.setInterval(update, 60 * 1000);
}
// === END SUNRISE SUNSET BAR ===

function getWeekday(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = date.getDate();
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date);
  return `${day}日${weekday}`;
}

function getHourLabel(timeText) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(timeText));
}

function formatCity(city) {
  if (city.source === "location") {
    return city.displayName;
  }

  const locationParts = [
    city.district,
    city.admin3,
    city.admin2,
    city.admin1,
    city.country
  ].filter(Boolean);

  return [...new Set(locationParts)].join(", ");
}

function getPrimaryPlaceName(city) {
  return city.district || city.name;
}

async function searchPlaces(query) {
  const correction = getDistrictCorrection(query);
  if (correction) {
    return [normalizeCorrectedDistrict(correction, query)];
  }

  const url = buildUrl(geocodingUrl, {
    name: query,
    count: "8",
    language: "zh",
    format: "json"
  });
  const data = await fetchJson(url, "地点查询失败，请稍后重试。");
  if (!data.results || data.results.length === 0) {
    throw new Error("没有找到这个区县或城市，请换一个中英文名称试试。");
  }
  return data.results.map((result) => normalizeCity(result));
}

async function searchPlacesDebounced(query) {
  window.clearTimeout(searchDebounceTimer);
  const requestId = searchRequestId + 1;
  searchRequestId = requestId;

  if (query.length < 2) {
    clearSearchResults();
    return;
  }

  searchDebounceTimer = window.setTimeout(async () => {
    setStatus(`正在搜索 ${query}...`, "loading");

    try {
      const candidates = await searchPlaces(query);
      if (requestId !== searchRequestId) {
        return;
      }
      renderSearchResults(candidates);
      setStatus(`找到 ${candidates.length} 个候选地点，请选择正确的区县/城市。`, "success");
    } catch (error) {
      if (requestId !== searchRequestId) {
        return;
      }
      clearSearchResults();
      setStatus(error.message, "error");
    }
  }, searchDebounceMs);
}

async function reverseGeocode(position) {
  const url = buildUrl(reverseGeocodingUrl, {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    localityLanguage: "zh"
  });
  return fetchJson(url, "当前位置地址解析失败。");
}

async function fetchWeather(city) {
  const url = buildUrl(forecastUrl, {
    latitude: city.latitude,
    longitude: city.longitude,
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    hourly: "temperature_2m,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset",
    timezone: city.timezone || "auto",
    forecast_days: "5"
  });
  return fetchJson(url, "天气数据加载失败，请稍后重试。");
}

function getNext24Hours(hourly) {
  const now = Date.now();
  const startIndex = hourly.time.findIndex((time) => new Date(time).getTime() >= now - 60 * 60 * 1000);
  const index = startIndex >= 0 ? startIndex : 0;
  return {
    labels: hourly.time.slice(index, index + 24).map(getHourLabel),
    values: hourly.temperature_2m.slice(index, index + 24)
  };
}

function renderSearchResults(candidates) {
  searchCandidates = candidates;
  searchResults.hidden = candidates.length === 0;

  if (candidates.length === 0) {
    searchResults.innerHTML = "";
    return;
  }

  searchResults.innerHTML = `
    <p class="result-hint">请选择正确的区县/城市，避免同名地点误选。</p>
    ${candidates.map((city, index) => `
      <button class="result-option" type="button" data-result-index="${index}">
        <strong>${getPrimaryPlaceName(city)}</strong>
        <span>${formatCity(city)}</span>
      </button>
    `).join("")}
  `;
}

function clearSearchResults() {
  searchCandidates = [];
  searchResults.hidden = true;
  searchResults.innerHTML = "";
}

function renderCurrent(city, current) {
  locationName.textContent = getPrimaryPlaceName(city);
  weatherState.textContent = getWeatherText(current.weather_code);
  renderWeatherAnimation(current.weather_code);
  currentTemp.textContent = roundValue(current.temperature_2m);
  humidity.textContent = roundValue(current.relative_humidity_2m);
  windSpeed.textContent = roundValue(current.wind_speed_10m);
  applyWeatherTheme(current.weather_code);
}

// === UI REFACTOR START ===
function renderDailySummary(daily) {
  const max = roundValue(daily?.temperature_2m_max?.[0]);
  const min = roundValue(daily?.temperature_2m_min?.[0]);
  dailyRange.textContent = `最高 ${max}° / 最低 ${min}°`;
  sunriseTime.textContent = formatClock(daily?.sunrise?.[0]);
}
// === UI REFACTOR END ===

function renderForecast(daily) {
  forecastRow.innerHTML = daily.time.map((date, index) => {
    const max = roundValue(daily.temperature_2m_max[index]);
    const min = roundValue(daily.temperature_2m_min[index]);
    const rain = roundValue(daily.precipitation_probability_max[index]);
    const code = daily.weather_code[index];
    const state = getWeatherText(code);
    const icon = getWeatherIcon(code);

    return `
      <article class="forecast-card">
        <p class="forecast-date">${getWeekday(date)}</p>
        <span class="forecast-icon" aria-hidden="true">${icon}</span>
        <strong>${state}</strong>
        <div class="forecast-temp">
          <b>${max}°</b>
          <span>${min}°</span>
        </div>
        <p class="rain-note">降水概率 ${rain}%</p>
      </article>
    `;
  }).join("");
}

function renderChart(hourly) {
  const next24 = getNext24Hours(hourly);
  const chartTextColor = "rgba(61, 64, 91, 0.72)";
  const chartGridColor = "rgba(61, 64, 91, 0.12)";
  const chartLineColor = "rgba(224, 122, 95, 1)";
  const chartFillColor = "rgba(224, 122, 95, 0.2)";
  const chartPointColor = "rgba(224, 122, 95, 1)";

  if (!window.Chart) {
    setStatus("天气已加载，但 Chart.js 未能加载，无法显示折线图。", "error");
    return;
  }

  if (temperatureChart) {
    temperatureChart.destroy();
  }

  temperatureChart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: next24.labels,
      datasets: [
        {
          label: "温度 °C",
          data: next24.values,
          borderColor: chartLineColor,
          backgroundColor: chartFillColor,
          pointBackgroundColor: chartPointColor,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 7,
          borderWidth: 4,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `温度 ${context.parsed.y}°C`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: chartTextColor,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: {
            color: chartGridColor
          },
          ticks: {
            color: chartTextColor,
            callback: (value) => `${value}°`
          }
        }
      }
    }
  });
}

function renderFavorites() {
  favoriteButton.disabled = !currentCity;

  if (favorites.length === 0) {
    favoriteList.innerHTML = '<p class="city-empty">搜索区县或使用定位后点击“收藏当前”，这里会保存常看的地点。</p>';
    return;
  }

  favoriteList.innerHTML = favorites.map((city) => {
    const activeClass = currentCity && currentCity.id === city.id ? " active" : "";
    return `
      <div class="city-item${activeClass}">
        <button type="button" data-city-id="${city.id}">
          ${getPrimaryPlaceName(city)}
          <small>${formatCity(city)}</small>
        </button>
        <button class="remove-city" type="button" data-remove-id="${city.id}" aria-label="删除 ${getPrimaryPlaceName(city)}">×</button>
      </div>
    `;
  }).join("");
}

function startAutoRefresh() {
  window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(() => {
    if (!currentCity || isLoading) {
      return;
    }
    loadCity(currentCity, { silent: true });
  }, autoRefreshMs);
}

async function loadCity(city, options = {}) {
  const { silent = false, keepSearchResults = false } = options;
  currentCity = city;
  if (!keepSearchResults) {
    clearSearchResults();
  }
  setLoading(true, silent);
  if (!silent) {
    setStatus(`正在加载 ${formatCity(city)} 的天气...`, "loading");
  }

  try {
    const weather = await fetchWeather(city);
    updateThemeMode(weather);
    renderCurrent(city, weather.current);
    renderDailySummary(weather.daily);
    renderSunTrack(weather.daily);
    renderForecast(weather.daily);
    renderChart(weather.hourly);
    await updateAirAndUv(city, weather);
    saveJson(lastCityKey, city);
    setStatus(`已更新 ${formatCity(city)} · ${weather.current.time.replace("T", " ")}`, "success");
    startAutoRefresh();
    if (!silent) {
      window.setTimeout(triggerCardEntryAnimations, 50);
    }
  } catch (error) {
    setStatus(error.message, "error");
    if (!silent) {
      window.setTimeout(triggerErrorShake, 100);
    }
  } finally {
    setLoading(false, silent);
    renderFavorites();
  }
}

function addCurrentFavorite() {
  if (!currentCity) {
    return;
  }

  const exists = favorites.some((city) => city.id === currentCity.id);
  if (!exists) {
    favorites = [currentCity, ...favorites].slice(0, 8);
    saveJson(favoritesKey, favorites);
    renderFavorites();
    setStatus(`${getPrimaryPlaceName(currentCity)} 已加入收藏。`);
  } else {
    setStatus(`${getPrimaryPlaceName(currentCity)} 已在收藏列表中。`);
  }
}

function removeFavorite(cityId) {
  favorites = favorites.filter((city) => city.id !== cityId);
  saveJson(favoritesKey, favorites);
  renderFavorites();
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("当前浏览器不支持定位。"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 10 * 60 * 1000
    });
  });
}

function getLocationErrorMessage(error) {
  if (error.code === 1) {
    return "定位权限被拒绝，请在浏览器地址栏允许位置权限后重试。";
  }
  if (error.code === 2) {
    return "暂时无法获取当前位置，请稍后重试或手动搜索区县。";
  }
  if (error.code === 3) {
    return "定位超时，请稍后重试或手动搜索区县。";
  }
  return error.message || "定位失败，请手动搜索区县。";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();
  window.clearTimeout(searchDebounceTimer);
  searchRequestId += 1;

  if (!query) {
    setStatus("请输入区县或城市名称。", "error");
    return;
  }

  setLoading(true);
  setStatus(`正在搜索 ${query}...`, "loading");

  try {
    const candidates = await searchPlaces(query);
    renderSearchResults(candidates);
    if (candidates.length === 1) {
      await loadCity(candidates[0]);
      return;
    }
    setStatus(`找到 ${candidates.length} 个候选地点，请选择正确的区县/城市。`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoading(false);
  }
});

cityInput.addEventListener("input", (event) => {
  const query = event.target.value.trim();
  searchPlacesDebounced(query);
});

searchResults.addEventListener("click", (event) => {
  const resultButton = event.target.closest("[data-result-index]");
  if (!resultButton) {
    return;
  }

  const city = searchCandidates[Number(resultButton.dataset.resultIndex)];
  if (city) {
    loadCity(city);
  }
});

locationButton.addEventListener("click", async () => {
  window.clearTimeout(searchDebounceTimer);
  searchRequestId += 1;
  setLoading(true);
  clearSearchResults();
  setStatus("正在请求浏览器定位权限...", "loading");

  try {
    const position = await getCurrentPosition();
    setStatus("定位成功，正在解析当前地址...", "loading");
    let address = null;
    try {
      address = await reverseGeocode(position);
    } catch {
      address = null;
    }
    await loadCity(normalizeCurrentLocation(position, address));
  } catch (error) {
    setStatus(getLocationErrorMessage(error), "error");
  } finally {
    setLoading(false);
  }
});

favoriteButton.addEventListener("click", addCurrentFavorite);

favoriteList.addEventListener("click", (event) => {
  const cityButton = event.target.closest("[data-city-id]");
  const removeButton = event.target.closest("[data-remove-id]");

  if (removeButton) {
    removeFavorite(removeButton.dataset.removeId);
    return;
  }

  if (cityButton) {
    const city = favorites.find((item) => item.id === cityButton.dataset.cityId);
    if (city) {
      loadCity(city);
    }
  }
});

function boot() {
  renderFavorites();
  document.body.dataset.weather = "default";
  applyThemeMode(getAutoThemeMode(null));
  const lastCity = loadJson(lastCityKey, null);
  if (lastCity) {
    loadCity(lastCity);
    return;
  }

  searchPlaces("北京")
    .then((places) => loadCity(places[0]))
    .catch((error) => setStatus(error.message || "输入区县或城市名，查看实时天气。", "error"));
}

// === IOS POLISH: VISIBILITY HANDLER ===
function handleVisibilityChange() {
  if (document.hidden) {
    window.clearInterval(refreshTimer);
    window.clearInterval(sunTrackTimer);
  } else {
    if (currentCity && !isLoading) {
      startAutoRefresh();
    }
    if (sunTrackCard) {
      const daily = { sunrise: [], sunset: [] };
      renderSunTrack(daily);
    }
  }
}

// === UI REFACTOR START ===
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextMode = document.body.dataset.mode === "night" ? "day" : "night";
    localStorage.setItem(themeModeKey, nextMode);
    applyThemeMode(nextMode);
  });
}
// === UI REFACTOR END ===

document.addEventListener("visibilitychange", handleVisibilityChange);

boot();



