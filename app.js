// Hardcoded Configuration for Public Deployment
// IMPORTANT: Go to https://console.amap.com/dev/key/app
// 1. Create a Key for "Web端 (JS API)"
// 2. Set the "Safe Domain" (Whiltelist) to: https://AlexanderShang.github.io
const JS_API_KEY = 3adde9a29c5e3f2482f52b6a320423c5;
const SECURITY_CODE = ed2bdf69fa5c9278662ea8d7500a29c1; // Only needed if you don't use proxy, but JS API loader handles key mainly.

// Inject Security Code dynamically (must be before loader usage)
window._AMapSecurityConfig = {
    securityJsCode: SECURITY_CODE,
};

// DOM Elements
const addressInput = document.getElementById('address-input');
const smartSearchBtn = document.getElementById('smart-search-btn');
const clearTextBtn = document.getElementById('clear-text-btn');
const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const loadingSpinner = document.getElementById('loading-spinner');
const analysisResult = document.getElementById('analysis-result');
const resProvince = document.getElementById('res-province');
const resKeyword = document.getElementById('res-keyword');

// Admin Data for local parsing optimization
let provinceList = [];

// Init Function
async function initApp() {
    try {
        await loadAdminData();
        await initAMap();
        console.log('App Initialized');
    } catch (e) {
        console.error('Init Failed:', e);
        // alert('初始化失败，请检查网络或Key配置');
    }
}

// 1. Load Admin Data
async function loadAdminData() {
    try {
        const res = await fetch('admin-data/province.json');
        provinceList = await res.json();
    } catch (e) { console.warn('Local admin data missing', e); }
}

// 2. Init AMap JS API
let placeSearch = null;
let geocoder = null;

async function initAMap() {
    if (typeof AMapLoader === 'undefined') return;

    try {
        const AMap = await AMapLoader.load({
            key: JS_API_KEY,
            version: "2.0",
            plugins: ['AMap.PlaceSearch', 'AMap.Geocoder'],
        });

        // Initialize Services
        placeSearch = new AMap.PlaceSearch({
            pageSize: 20,
            pageIndex: 1,
            extensions: 'all', // Important for detailed info
        });

        geocoder = new AMap.Geocoder({
            radius: 1000,
            extensions: "all"
        });

    } catch (e) {
        console.error('AMap Loader Error:', e);
    }
}

// logic: Parse -> PlaceSearch -> Regeo
async function handleSmartSearch() {
    const text = addressInput.value.trim();
    if (!text) { alert('请先输入地址'); return; }

    // UI Update
    smartSearchBtn.disabled = true;
    smartSearchBtn.innerText = '🔍 查询中...';
    resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    loadingSpinner.style.display = 'block';

    // Parse
    const { province, keyword } = parseAddress(text);

    // Show Analysis
    analysisResult.style.display = 'block';
    resProvince.textContent = province ? province.name : '自动范围';
    resProvince.style.display = 'inline-block';
    resKeyword.textContent = keyword;

    // Execute Search
    if (!placeSearch) {
        alert('地图组件未初始化，请检查Key配置');
        resetUI();
        return;
    }

    // Set City if province found to improve accuracy
    if (province) {
        placeSearch.setCity(province.name);
    } else {
        placeSearch.setCity('全国');
    }

    placeSearch.search(keyword, async (status, result) => {
        if (status === 'complete' && result.info === 'OK') {
            // Process Results
            const pois = result.poiList.pois;
            if (!pois || pois.length === 0) {
                showNoResults();
            } else {
                await processAndDisplayResults(pois);
            }
        } else {
            showNoResults();
        }
        resetUI();
    });
}

async function processAndDisplayResults(pois) {
    // Parallel Regeo check for each POI
    const processed = await Promise.all(pois.map(async (poi) => {
        let streetName = '';

        // 1. Try Regeo (Accurate)
        if (poi.location) {
            const regeoStreet = await doRegeo(poi.location);
            if (regeoStreet) streetName = regeoStreet;
        }

        // 2. Fallback to POI data
        if (!streetName && poi.address && typeof poi.address === 'string') {
            // Sometimes address contains street info
        }

        // Formatting
        let displayStreet = '暂无明确街道信息';
        // Logic: specific township > adname
        if (streetName) {
            if (streetName.endsWith('办事处')) displayStreet = streetName;
            else if (streetName.endsWith('街道') || streetName.endsWith('镇') || streetName.endsWith('乡')) displayStreet = streetName + '办事处';
            else displayStreet = streetName + '街道办事处';
        } else if (poi.adname) {
            displayStreet = `${poi.adname} (未精确匹配到街道)`;
        }

        return `
            <div class="result-card">
                <h3>${poi.name}</h3>
                <div class="info-item"><strong>📍 地址：</strong>${poi.address || poi.name}</div>
                <div class="info-item"><strong>🏛️ 街道办事处：</strong><br><span class="highlight-street">${displayStreet}</span></div>
            </div>
        `;
    }));

    loadingSpinner.style.display = 'none';
    resultsContainer.innerHTML = processed.join('');
}

// Wrapper for Geocoder.getAddress
function doRegeo(location) {
    return new Promise((resolve) => {
        if (!geocoder) { resolve(null); return; }
        geocoder.getAddress(location, (status, result) => {
            if (status === 'complete' && result.regeocode) {
                resolve(result.regeocode.addressComponent.township);
            } else {
                resolve(null);
            }
        });
    });
}

function parseAddress(text) {
    let cleanText = text.replace(/(\+?86)?\s?1[3-9]\d{9}/g, ' ');
    const noiseWords = ['收货人', '姓名', '电话', '手机', '联系方式', '地址', '所在地区', '详细地址', 'Default', '：', ':', ',', '，', '。'];
    noiseWords.forEach(word => cleanText = cleanText.replaceAll(word, ' '));

    let foundProvince = null;
    for (const p of provinceList) {
        if (cleanText.includes(p.name)) { foundProvince = p; break; }
    }

    return {
        province: foundProvince,
        keyword: cleanText.replace(/\s+/g, ' ').trim()
    };
}

function showNoResults() {
    loadingSpinner.style.display = 'none';
    resultsContainer.innerHTML = '<div class="no-results">😕 未找到匹配结果</div>';
}

function resetUI() {
    smartSearchBtn.disabled = false;
    smartSearchBtn.innerText = '🔍 智能识别并查询';
}

// Event Listeners
smartSearchBtn.addEventListener('click', handleSmartSearch);
clearTextBtn.addEventListener('click', () => {
    addressInput.value = '';
    analysisResult.style.display = 'none';
    resultsSection.style.display = 'none';
});

// Start
initApp();
