// DOM Elements
const addressInput = document.getElementById('address-input');
const smartSearchBtn = document.getElementById('smart-search-btn');
const clearTextBtn = document.getElementById('clear-text-btn');
const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const loadingSpinner = document.getElementById('loading-spinner');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');

// Analysis Result DOM
const analysisResult = document.getElementById('analysis-result');
const resProvince = document.getElementById('res-province');
const resCity = document.getElementById('res-city');
const resDistrict = document.getElementById('res-district');
const resKeyword = document.getElementById('res-keyword');

// Data Storage
let provinceList = [];
let cityList = [];
let areaList = [];

// AMap Key Handling
const AMAP_KEY_STORAGE_KEY = 'user_amap_key';
let currentAmapKey = localStorage.getItem(AMAP_KEY_STORAGE_KEY) || '';

// --- Initialization Check ---
if (window.location.protocol === 'file:') {
    const warning = document.createElement('div');
    warning.style.cssText = 'background:#fff3cd; color:#856404; padding:15px; text-align:center; border-bottom:1px solid #ffeeba;';
    warning.innerHTML = '⚠️ <strong>警告：</strong> 检测到您直接打开了 HTML 文件。为了正常加载省市数据和使用搜索功能，建议使用 VS Code 的 "Live Server" 插件或本地服务器运行此项目，否则可能会因为浏览器安全策略导致功能无法使用。';
    document.body.insertBefore(warning, document.body.firstChild);
}

// Load Admin Data (Provinces/Cities/Areas)
async function loadAdminData() {
    try {
        // We still load this for local parsing optimization, though AMap handles geocoding
        const [provinceRes, cityRes, areaRes] = await Promise.all([
            fetch('admin-data/province.json'),
            fetch('admin-data/city.json'),
            fetch('admin-data/area.json'),
        ]);

        if (!provinceRes.ok || !cityRes.ok || !areaRes.ok) {
            throw new Error(`HTTP Error`);
        }

        provinceList = await provinceRes.json();
        cityList = await cityRes.json();
        areaList = await areaRes.json();
        console.log('Admin data loaded.');
    } catch (error) {
        console.error('Failed to load admin data:', error);
        // Non-blocking error since we rely on AMap mostly now
    }
}

// --- Smart Parsing Logic ---
// Purpose: Extract the "Keywords" for the search query from a messy text
function parseAddress(text) {
    let cleanText = text.trim();
    if (!cleanText) return null;

    // 1. Strip Phone Numbers
    cleanText = cleanText.replace(/(\+?86)?\s?1[3-9]\d{9}/g, ' ');

    // 2. Strip Noise
    const noiseWords = ['收货人', '姓名', '电话', '手机', '联系方式', '地址', '所在地区', '详细地址', 'Default', '：', ':', ',', '，', '。'];
    noiseWords.forEach(word => {
        cleanText = cleanText.replaceAll(word, ' ');
    });

    let foundProvince = null;
    let foundCity = null;
    let foundDistrict = null;

    // Simple matching (Optimistic)
    for (const p of provinceList) {
        const shortName = p.name.replace(/(省|市|自治区|壮族|回族|维吾尔|特别行政区)/g, '');
        if (cleanText.includes(p.name) || (shortName.length >= 2 && cleanText.includes(shortName))) {
            foundProvince = p;
            break;
        }
    }

    // City & District logic omitted for brevity as AMap is robust, 
    // but we can do a quick check to display "Parsed Tags" to user
    // ... (Simplified for this version to focus on search)

    let keyword = cleanText.replace(/\s+/g, ' ').trim();

    return {
        province: foundProvince,
        keyword: keyword,
        original: text
    };
}

// --- CORE LOGIC: Reverse Geocoding for Administrative Region ---
// This is the "LBS Service - Administrative Region Query" logic the user requested
async function limitRegeo(location) {
    if (!currentAmapKey) return null;
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${currentAmapKey}&location=${location}&extensions=base&radius=1000`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === '1' && data.regeocode && data.regeocode.addressComponent) {
            return data.regeocode.addressComponent.township || null;
        }
    } catch (e) {
        console.warn('Regeo error', e);
    }
    return null;
}

// --- Main Search Workflow ---
async function handleSmartSearch() {
    const text = addressInput.value;
    if (!text.trim()) {
        alert('请先输入地址。');
        return;
    }

    const startBtn = smartSearchBtn;
    startBtn.disabled = true;
    startBtn.innerText = '🤖 分析中...';

    // 1. Basic cleaning
    const parsed = parseAddress(text);

    // Display Tags (Simplified)
    analysisResult.style.display = 'block';
    resProvince.textContent = parsed.province ? parsed.province.name : '自动识别';
    resKeyword.textContent = parsed.keyword.substring(0, 20) + '...';
    resCity.style.display = 'none'; // Simplify UI
    resDistrict.style.display = 'none';

    // 2. Search
    resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    loadingSpinner.style.display = 'block';
    startBtn.innerText = '🔍 查询中...';

    try {
        // Step A: Text Search to get Location (POI)
        // If province found, restrict city
        const cityParam = parsed.province ? parsed.province.name : '';
        const searchUrl = `https://restapi.amap.com/v3/place/text?key=${currentAmapKey}&keywords=${encodeURIComponent(parsed.keyword)}&city=${encodeURIComponent(cityParam)}&children=1&offset=20&page=1&extensions=all`;

        const res = await fetch(searchUrl);
        const data = await res.json();

        if (data.status === '0') throw new Error(data.info);
        if (!data.pois || data.pois.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">未找到结果，请尝试更详细的地址。</div>';
        } else {
            // Step B: For each POI, Perform Regeo (Administrative Region Query)
            const results = await Promise.all(data.pois.map(async (poi) => {
                let streetName = '';

                // Priority: Regeo Result > POI Result
                if (poi.location) {
                    const regeoTownship = await limitRegeo(poi.location);
                    if (regeoTownship && typeof regeoTownship === 'string') {
                        streetName = regeoTownship;
                    }
                }

                // Fallback to POI data if Regeo fails or returns nothing
                if (!streetName && poi.township && !Array.isArray(poi.township)) {
                    streetName = poi.township;
                }

                // Formatting
                let displayStreet = '暂无明确街道信息';
                if (streetName) {
                    if (streetName.endsWith('办事处')) displayStreet = streetName;
                    else if (streetName.endsWith('街道') || streetName.endsWith('镇') || streetName.endsWith('乡')) displayStreet = streetName + '办事处';
                    else displayStreet = streetName + '街道办事处';
                } else if (poi.adname) {
                    displayStreet = `${poi.adname} (未精确匹配到街道)`;
                }

                return {
                    name: poi.name,
                    address: poi.address,
                    streetOffice: displayStreet
                };
            }));

            // Render
            loadingSpinner.style.display = 'none';
            resultsContainer.innerHTML = results.map(item => `
                <div class="result-card">
                    <h3>${item.name}</h3>
                    <div class="info-item"><strong>📍 地址：</strong>${item.address}</div>
                    <div class="info-item"><strong>🏛️ 街道办事处：</strong><br><span class="highlight-street">${item.streetOffice}</span></div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error(e);
        alert('查询出错: ' + e.message);
    }

    startBtn.disabled = false;
    startBtn.innerText = '🔍 智能识别并查询';
}

// Listeners
smartSearchBtn.addEventListener('click', handleSmartSearch);
clearTextBtn.addEventListener('click', () => {
    addressInput.value = '';
    analysisResult.style.display = 'none';
    resultsSection.style.display = 'none';
    addressInput.focus();
});

// Key Management
if (currentAmapKey) {
    apiKeyInput.value = currentAmapKey;
    saveKeyBtn.innerText = 'Key 已加载';
}
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        currentAmapKey = key;
        localStorage.setItem(AMAP_KEY_STORAGE_KEY, key);
        alert('✅ Key Saved');
    } else {
        alert('Key 不能为空');
    }
});

document.addEventListener('DOMContentLoaded', loadAdminData);
