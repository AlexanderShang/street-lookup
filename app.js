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
        console.log('App Initialized (Pure Geocoding Mode)');
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

// 2. Init AMap JS API (Geocoder ONLY)
let geocoder = null;

async function initAMap() {
    if (typeof AMapLoader === 'undefined') return;

    try {
        const AMap = await AMapLoader.load({
            key: JS_API_KEY,
            version: "2.0",
            plugins: ['AMap.Geocoder'], // Only Geocoder
        });

        geocoder = new AMap.Geocoder({
            radius: 1000,
            extensions: "all" // Required for detailed admin info
        });

    } catch (e) {
        console.error('AMap Loader Error:', e);
        alert('❌ 地图组件加载失败\n请按 F12 查看控制台。\n可能原因：Key/域名配置错误。');
    }
}

// --- STRICT WORKFLOW: Geocode -> Regeocode -> Admin Info ---
async function handleSmartSearch() {
    const text = addressInput.value.trim();
    if (!text) { alert('请先输入地址'); return; }

    // UI Update
    smartSearchBtn.disabled = true;
    smartSearchBtn.innerText = '🔍 查询中...';
    resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    loadingSpinner.style.display = 'block';

    // Parse (Just to show user what we found)
    const { province, keyword } = parseAddress(text);

    analysisResult.style.display = 'block';
    resProvince.textContent = province ? province.name : '自动范围';
    resProvince.style.display = 'inline-block';
    resKeyword.textContent = keyword;

    if (!geocoder) {
        alert('地图组件未初始化');
        resetUI();
        return;
    }

    // Safety Timeout (10s) to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
        if (smartSearchBtn.disabled) {
            console.warn('Search timed out');
            alert('查询超时，请检查网络或Key配置。');
            resetUI();
        }
    }, 10000);

    // Step 1: Forward Geocoding (Address -> Lat/Lon)
    // We strictly use the "Address" to find the "Administrative Coordinate"
    console.log(`Starting Geocode search for: ${keyword}`);
    geocoder.getLocation(keyword, async (status, result) => {
        clearTimeout(safetyTimeout); // Clear timeout on response
        console.log('Geocode callback:', status, result);
        if (status === 'complete' && result.geocodes.length > 0) {
            // We take the best match
            const geoResult = result.geocodes[0];
            const location = geoResult.location;

            // Step 2: Reverse Geocoding (Lat/Lon -> Strictly Administrative Township)
            // This guarantees we get the Admin Region, not a random POI name
            performRegeoAndDisplay(location, geoResult.formattedAddress);

        } else {
            console.warn('Geocode failed or empty');
            showNoResults();
            resetUI();
        }
    });
}

function performRegeoAndDisplay(location, formattedAddress) {
    console.log('Starting Regeo for location:', location);
    geocoder.getAddress(location, (status, result) => {
        console.log('Regeo callback:', status, result);
        resetUI();
        loadingSpinner.style.display = 'none';

        if (status === 'complete' && result.regeocode) {
            const component = result.regeocode.addressComponent;
            const township = component.township; // The "Street Office" level
            const adcode = component.adcode;

            // Formatting
            let displayStreet = '暂无明确街道信息';
            if (township) {
                if (township.endsWith('办事处')) displayStreet = township;
                else if (township.endsWith('街道') || township.endsWith('镇') || township.endsWith('乡')) displayStreet = township + '办事处';
                else displayStreet = township + '街道办事处';
            } else {
                displayStreet = `${component.district} (未匹配到街道)`;
            }

            // Render Single Strict Result
            resultsContainer.innerHTML = `
                <div class="result-card">
                    <h3>📍 匹配结果</h3>
                    <div class="info-item"><strong>� 规范地址：</strong>${formattedAddress}</div>
                    <div class="info-item"><strong>🏙️ 所属行政区：</strong>${component.province || ''}${component.city || ''}${component.district || ''}</div>
                    <div class="info-item">
                        <strong>🏛️ 街道办事处：</strong><br>
                        <span class="highlight-street">${displayStreet}</span>
                    </div>
                    <div class="info-item" style="font-size:12px; color:#aaa; margin-top:5px;">
                        行政区划代码：${adcode}
                    </div>
                </div>
            `;
        } else {
            showNoResults();
        }
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
    resultsContainer.innerHTML = '<div class="no-results">😕 未找到此地址的行政区域信息</div>';
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
