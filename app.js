console.log('App.js loaded successfully.');

// --- Configuration ---
const JS_API_KEY = '3adde9a29c5e3f2482f52b6a320423c5';
// Security code is handled in index.html, but keeping reference here for clarity if needed.

// --- DOM Elements ---
let addressInput, smartSearchBtn, clearTextBtn, resultsSection, resultsContainer, loadingSpinner, analysisResult, resProvince, resKeyword;

// --- State ---
let provinceList = [];
let placeSearch = null;
let geocoder = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Ready. Initializing...');

    // 1. Bind Elements
    addressInput = document.getElementById('address-input');
    smartSearchBtn = document.getElementById('smart-search-btn');
    clearTextBtn = document.getElementById('clear-text-btn');
    resultsSection = document.getElementById('results-section');
    resultsContainer = document.getElementById('results-container');
    loadingSpinner = document.getElementById('loading-spinner');
    analysisResult = document.getElementById('analysis-result');
    resProvince = document.getElementById('res-province');
    resKeyword = document.getElementById('res-keyword');

    if (!addressInput || !smartSearchBtn) {
        alert('❌ 页面元素加载失败，请刷新重试。');
        return;
    }

    // 2. Bind Events
    smartSearchBtn.addEventListener('click', handleSmartSearch);
    clearTextBtn.addEventListener('click', resetForm);

    // 3. Load Data & Map
    initApp();
});

async function initApp() {
    try {
        await loadAdminData();
        await initAMap();
        console.log('App initialization complete.');
    } catch (e) {
        console.error('Init Error:', e);
        alert('❌ 初始化失败，请检查网络。\n详细错误请按F12查看控制台。');
    }
}

async function loadAdminData() {
    try {
        const res = await fetch('admin-data/province.json');
        provinceList = await res.json();
    } catch (e) { console.warn('Local admin data missing', e); }
}

async function initAMap() {
    if (typeof AMapLoader === 'undefined') {
        throw new Error('AMapLoader is undefined. Script not loaded.');
    }

    const AMap = await AMapLoader.load({
        key: JS_API_KEY,
        version: "2.0",
        plugins: ['AMap.PlaceSearch', 'AMap.Geocoder'],
    });

    placeSearch = new AMap.PlaceSearch({
        pageSize: 10,
        pageIndex: 1,
        extensions: 'all',
    });

    geocoder = new AMap.Geocoder({
        radius: 1000, // Search radius for Regeo
        extensions: "all"
    });
}

// --- Main Logic: Hybrid Search ---
async function handleSmartSearch() {
    const text = addressInput.value.trim();
    if (!text) { alert('请先输入地址'); return; }

    // UI Loading State
    setLoadingState(true);

    // 1. Parse Text
    const parsingObj = parseAddress(text);
    updateAnalysisUI(parsingObj);

    // 2. Map Search
    if (!placeSearch || !geocoder) {
        alert('地图组件尚未就绪，请稍候再试或刷新。');
        setLoadingState(false);
        return;
    }

    // Contextualize Search
    if (parsingObj.province) {
        placeSearch.setCity(parsingObj.province.name);
    } else {
        placeSearch.setCity('全国');
    }

    // Safety Timeout
    const safetyTimer = setTimeout(() => {
        if (loadingSpinner.style.display !== 'none') {
            console.warn('Search Timed Out');
            alert('❌ 查询超时。\n请检查您的网络，或确认Key是否配置了正确的域名白名单。');
            setLoadingState(false);
        }
    }, 12000); // 12 seconds

    // Strategy A: POI Search (Find "Place")
    placeSearch.search(parsingObj.keyword, async (status, result) => {
        clearTimeout(safetyTimer);
        console.log('POI Search Result:', status, result);

        if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
            // Success A
            await processPoisAndDisplay(result.poiList.pois);
            setLoadingState(false);
        } else {
            // Fail A -> Strategy B: Geocoding (Find "Address")
            console.log('POI failed. Switching to Geocoding...');
            doGeocodeSearch(parsingObj.keyword, safetyTimer);
        }
    });
}

function doGeocodeSearch(keyword, timerArg) {
    geocoder.getLocation(keyword, async (status, result) => {
        if (timerArg) clearTimeout(timerArg);
        console.log('Geocode Result:', status, result);

        if (status === 'complete' && result.geocodes.length > 0) {
            // Success B
            const geo = result.geocodes[0];
            const mockPoi = {
                name: "📍 地址精确匹配",
                address: geo.formattedAddress,
                location: geo.location
            };
            await processPoisAndDisplay([mockPoi]);
        } else {
            // Fail B -> No Results
            showNoResults();
        }
        setLoadingState(false);
    });
}

// Core: Coordinates -> Administrative Info (Regeo)
async function processPoisAndDisplay(pois) {
    if (!pois || pois.length === 0) return;

    const cardsHtml = await Promise.all(pois.map(async (poi) => {
        // Always verify true admin info using Regeo
        const adminInfo = await getRegeoAdminInfo(poi.location);

        return `
            <div class="result-card">
                <h3>${poi.name}</h3>
                <div class="info-item"><strong>📍 地址：</strong>${poi.address || poi.name}</div>
                <div class="info-item">
                    <strong>🏛️ 街道办事处：</strong><br>
                    <span class="highlight-street">${adminInfo.streetOffice}</span>
                </div>
                <div class="info-item" style="font-size:12px; color:#aaa; margin-top:5px;">
                    行政区划代码：${adminInfo.adcode || '--'}
                </div>
            </div>
        `;
    }));

    resultsContainer.innerHTML = cardsHtml.join('');
}

function getRegeoAdminInfo(location) {
    return new Promise((resolve) => {
        geocoder.getAddress(location, (status, result) => {
            if (status === 'complete' && result.regeocode) {
                const comp = result.regeocode.addressComponent;
                let township = comp.township;
                let display = '暂无明确街道信息';

                if (township && typeof township === 'string' && township.trim()) {
                    if (township.endsWith('办事处')) display = township;
                    else if (township.endsWith('街道') || township.endsWith('镇') || township.endsWith('乡')) display = township + '办事处';
                    else display = township + '街道办事处';
                } else {
                    display = `${comp.district || ''} (未匹配)`;
                }
                resolve({ streetOffice: display, adcode: comp.adcode });
            } else {
                resolve({ streetOffice: '查询失败', adcode: '' });
            }
        });
    });
}

// --- Helpers ---
function parseAddress(text) {
    let cleanText = text.replace(/(\+?86)?\s?1[3-9]\d{9}/g, ' ');
    const noiseWords = ['收货人', '姓名', '电话', '手机', '联系方式', '地址', '所在地区', '详细地址', 'Default', '：', ':', ',', '，', '。'];
    noiseWords.forEach(word => cleanText = cleanText.replaceAll(word, ' '));
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    let foundProvince = null;
    for (const p of provinceList) {
        if (cleanText.includes(p.name)) { foundProvince = p; break; }
    }
    return { province: foundProvince, keyword: cleanText };
}

function updateAnalysisUI(parsed) {
    analysisResult.style.display = 'block';
    resProvince.innerText = parsed.province ? parsed.province.name : '自动范围';
    resKeyword.innerText = parsed.keyword;
}

function setLoadingState(isLoading) {
    if (isLoading) {
        smartSearchBtn.disabled = true;
        smartSearchBtn.innerText = '🔍 查询中...';
        resultsSection.style.display = 'block';
        resultsContainer.innerHTML = '';
        loadingSpinner.style.display = 'block';
    } else {
        smartSearchBtn.disabled = false;
        smartSearchBtn.innerText = '🔍 智能识别并查询';
        loadingSpinner.style.display = 'none';
    }
}

function showNoResults() {
    resultsContainer.innerHTML = '<div class="no-results">😕 未找到匹配结果，请检查地址是否准确</div>';
}

function resetForm() {
    addressInput.value = '';
    analysisResult.style.display = 'none';
    resultsSection.style.display = 'none';
}
