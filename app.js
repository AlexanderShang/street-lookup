// Hardcoded Configuration for Public Deployment
// IMPORTANT: Go to https://console.amap.com/dev/key/app
// 1. Create a Key for "Web端 (JS API)"
// 2. Set the "Safe Domain" (Whiltelist) to: https://AlexanderShang.github.io
const JS_API_KEY = '3adde9a29c5e3f2482f52b6a320423c5';
const SECURITY_CODE = 'ed2bdf69fa5c9278662ea8d7500a29c1';

// Inject Security Code
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

// Admin Data for parsing optimization
let provinceList = [];

async function initApp() {
    try {
        await loadAdminData();
        await initAMap();
        console.log('App Initialized (Hybrid Mode)');
    } catch (e) {
        console.error('Init Failed:', e);
        alert('地图组件加载失败，请检查控制台报错。');
    }
}

async function loadAdminData() {
    try {
        const res = await fetch('admin-data/province.json');
        provinceList = await res.json();
    } catch (e) { console.warn('Local admin data missing', e); }
}

// 2. Init AMap JS API (Hybrid: PlaceSearch + Geocoder)
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

        placeSearch = new AMap.PlaceSearch({
            pageSize: 10, // Top 10 results
            pageIndex: 1,
            extensions: 'all',
        });

        geocoder = new AMap.Geocoder({
            radius: 1000,
            extensions: "all"
        });

    } catch (e) {
        console.error('AMap Loader Error:', e);
        alert('❌ 地图组件加载失败\n请按 F12 查看控制台。\n可能原因：Key/域名配置错误。');
    }
}

// --- HYBRID WORKFLOW: Find Place (Coordinate) -> Query Admin (Regeo) ---
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

    analysisResult.style.display = 'block';
    resProvince.textContent = province ? province.name : '自动范围';
    resProvince.style.display = 'inline-block';
    resKeyword.textContent = keyword;

    if (!placeSearch || !geocoder) {
        alert('地图组件未初始化');
        resetUI();
        return;
    }

    // Set City for better accuracy
    if (province) {
        placeSearch.setCity(province.name);
    } else {
        placeSearch.setCity('全国');
    }

    // Safety Timeout
    const safetyTimeout = setTimeout(() => {
        if (smartSearchBtn.disabled) {
            console.warn('Search timed out');
            alert('查询超时，请检查网络或Key配置。');
            resetUI();
        }
    }, 15000);

    // Step 1: Place Search (Find Coordinates of Community/Building)
    placeSearch.search(keyword, async (status, result) => {
        clearTimeout(safetyTimeout);

        if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
            // Found POIs
            await processAndDisplayResults(result.poiList.pois);
            resetUI();
        } else {
            // POI Failed -> Try Forward Geocoding (Address Search)
            console.log('POI Search failed, trying Geocoding...');
            geocoder.getLocation(keyword, async (status, result) => {
                clearTimeout(safetyTimeout);
                if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                    const geo = result.geocodes[0];
                    // Verify Admin Region for this coordinate too
                    const adminResult = await getAdminInfo(geo.location);

                    const mockPoi = {
                        name: "📍 地址匹配结果",
                        address: geo.formattedAddress,
                        streetOffice: adminResult.streetOffice, // Use the verified info
                        adcode: adminResult.adcode
                    };
                    renderResultCard(mockPoi);
                } else {
                    showNoResults();
                }
                resetUI();
            });
        }
    });
}

// Step 2: Parallel Regeo for POIs
async function processAndDisplayResults(pois) {
    const combinedResults = await Promise.all(pois.map(async (poi) => {
        // Crucial: Ignore POI's own weak admin info. Re-query using its location.
        const adminInfo = await getAdminInfo(poi.location);

        return {
            name: poi.name,
            address: poi.address,
            streetOffice: adminInfo.streetOffice,
            adcode: adminInfo.adcode
        };
    }));

    // Render all
    if (combinedResults.length > 0) {
        resultsContainer.innerHTML = combinedResults.map(item => createCardHTML(item)).join('');
        loadingSpinner.style.display = 'none';
    } else {
        showNoResults();
    }
}

// Helper: Coordinate -> Admin Info
function getAdminInfo(location) {
    return new Promise((resolve) => {
        geocoder.getAddress(location, (status, result) => {
            if (status === 'complete' && result.regeocode) {
                const comp = result.regeocode.addressComponent;
                let township = comp.township;

                // Format Street Office Name
                let display = '暂无明确街道信息';
                if (township && typeof township === 'string' && township.trim() !== '') {
                    if (township.endsWith('办事处')) display = township;
                    else if (township.endsWith('街道') || township.endsWith('镇') || township.endsWith('乡')) display = township + '办事处';
                    else display = township + '街道办事处';
                } else {
                    display = `${comp.district} (未匹配到街道)`;
                }

                resolve({
                    streetOffice: display,
                    adcode: comp.adcode
                });
            } else {
                resolve({ streetOffice: '查询失败', adcode: '' });
            }
        });
    });
}

function createCardHTML(item) {
    return `
        <div class="result-card">
            <h3>${item.name}</h3>
            <div class="info-item"><strong>📍 地址：</strong>${item.address || item.name}</div>
            <div class="info-item">
                <strong>🏛️ 街道办事处：</strong><br>
                <span class="highlight-street">${item.streetOffice}</span>
            </div>
            <div class="info-item" style="font-size:12px; color:#aaa; margin-top:5px;">
                行政区划代码：${item.adcode || '--'}
            </div>
        </div>
    `;
}

function renderResultCard(item) {
    loadingSpinner.style.display = 'none';
    resultsContainer.innerHTML = createCardHTML(item);
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

initApp();
