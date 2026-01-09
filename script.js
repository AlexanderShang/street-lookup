/**
 * Street Smart V2.0 - Core Logic
 * Architectural Highlights:
 * 1. strictInit(): Guarantees dependencies before execution.
 * 2. Hybrid Search: POI First -> Geocode Fallback.
 * 3. User-Centric: No alerts, only UI feedback.
 */

/* API Configuration */
const CONFIG = {
    key: '3adde9a29c5e3f2482f52b6a320423c5',
    securityCode: 'ed2bdf69fa5c9278662ea8d7500a29c1'
};

/* State Management */
const State = {
    mapReady: false,
    placeSearch: null,
    geocoder: null,
    provinceData: []
};

/* DOM Cache */
const UI = {
    input: null,
    btnSearch: null,
    btnClear: null,
    resultsArea: null,

    init() {
        this.input = document.getElementById('addrInput');
        this.btnSearch = document.getElementById('evtSearch');
        this.btnClear = document.getElementById('evtClear');
        this.resultsArea = document.getElementById('displayArea');

        // Bind Listeners
        this.btnSearch.addEventListener('click', () => Controller.handleSearch());
        this.btnClear.addEventListener('click', () => Controller.reset());
    },

    setLoading(isLoading) {
        if (isLoading) {
            this.btnSearch.disabled = true;
            this.btnSearch.innerHTML = '<span class="spinner"></span> 正在查询...';
            this.resultsArea.innerHTML = '';
        } else {
            this.btnSearch.disabled = false;
            this.btnSearch.innerHTML = '🔍 立即识别';
        }
    },

    showResult(poiName, address, streetName, adcode) {
        const html = `
            <div class="result-card">
                <div class="result-header">
                    <span class="poi-name">📍 ${poiName}</span>
                </div>
                <div class="address-row">
                    <span>${address || poiName}</span>
                </div>
                <div class="street-badge">
                    🏛️ ${streetName}
                </div>
                <div style="text-align:right; margin-top:10px; font-size:0.9rem; color:#90a4ae;">
                    行政代码: ${adcode || 'Unknown'}
                </div>
            </div>
        `;
        this.resultsArea.innerHTML = html;
        this.resultsArea.scrollIntoView({ behavior: 'smooth' });
    },

    showError(msg) {
        this.resultsArea.innerHTML = `<div class="status-msg">⚠️ ${msg}</div>`;
    }
};

/* Core Controller */
const Controller = {
    async init() {
        console.log('🚀 System Booting...');
        UI.init();

        try {
            await Promise.all([
                AMapService.init(),
                this.loadProvinces()
            ]);
            console.log('✅ System Ready');
        } catch (e) {
            console.error('Boot Failed:', e);
            UI.showError('组件加载超时，请检查网络或刷新页面');
        }
    },

    async loadProvinces() {
        try {
            const res = await fetch('admin-data/province.json');
            State.provinceData = await res.json();
        } catch (e) { console.warn('Offline Mode (Data Missing)'); }
    },

    async handleSearch() {
        const text = UI.input.value.trim();
        if (!text) return UI.input.focus();

        UI.setLoading(true);

        // Safety Break
        const timeout = setTimeout(() => {
            UI.setLoading(false);
            UI.showError('查询超时，请重试');
        }, 12000);

        try {
            // 1. Parse
            const { keyword, city } = this.parseInput(text);

            // 2. Search
            const result = await AMapService.hybridSearch(keyword, city);

            clearTimeout(timeout);

            if (result) {
                UI.showResult(result.name, result.address, result.street, result.adcode);
            } else {
                UI.showError('未找到相关地址，请尝试更详细的描述');
            }
        } catch (e) {
            clearTimeout(timeout);
            UI.showError('服务暂时不可用: ' + e.message);
        } finally {
            UI.setLoading(false);
        }
    },

    parseInput(text) {
        // Simple Clean
        let clean = text.replace(/(\+?86)?\s?1[3-9]\d{9}/g, ' ') // Remove phones
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ') // Remove symbols
            .replace(/\s+/g, ' ').trim();

        // Find Province/City hint
        let city = '全国';
        for (const p of State.provinceData) {
            if (clean.includes(p.name)) {
                city = p.name;
                break;
            }
        }
        return { keyword: clean, city };
    },

    reset() {
        UI.input.value = '';
        UI.resultsArea.innerHTML = '';
        UI.input.focus();
    }
};

/* AMap Service (The Engine) */
const AMapService = {
    init() {
        return new Promise((resolve, reject) => {
            if (typeof AMapLoader === 'undefined') return reject('Loader Missing');

            window._AMapSecurityConfig = { securityJsCode: CONFIG.securityCode };

            AMapLoader.load({
                key: CONFIG.key,
                version: "2.0",
                plugins: ['AMap.PlaceSearch', 'AMap.Geocoder']
            }).then((AMap) => {
                State.placeSearch = new AMap.PlaceSearch({ pageSize: 5, pageIndex: 1, extensions: 'all' });
                State.geocoder = new AMap.Geocoder({ radius: 1000, extensions: "all" });
                State.mapReady = true;
                resolve();
            }).catch(reject);
        });
    },

    hybridSearch(keyword, city) {
        return new Promise(async (resolve) => {
            if (!State.mapReady) throw new Error('Map Not Ready');

            State.placeSearch.setCity(city);

            // Strategy A: Local Place Search
            State.placeSearch.search(keyword, async (status, result) => {
                if (status === 'complete' && result.poiList?.pois?.length > 0) {
                    const topPoi = result.poiList.pois[0];
                    const admin = await this.verifyAdmin(topPoi.location);
                    resolve({
                        name: topPoi.name,
                        address: topPoi.address,
                        street: admin.street,
                        adcode: admin.adcode
                    });
                } else {
                    // Strategy B: Geocode
                    State.geocoder.getLocation(keyword, async (status, result) => {
                        if (status === 'complete' && result.geocodes?.length > 0) {
                            const geo = result.geocodes[0];
                            const admin = await this.verifyAdmin(geo.location);
                            resolve({
                                name: "地址匹配结果",
                                address: geo.formattedAddress,
                                street: admin.street,
                                adcode: admin.adcode
                            });
                        } else {
                            resolve(null);
                        }
                    });
                }
            });
        });
    },

    verifyAdmin(location) {
        return new Promise((resolve) => {
            State.geocoder.getAddress(location, (status, result) => {
                if (status === 'complete' && result.regeocode) {
                    const c = result.regeocode.addressComponent;
                    let street = c.township;

                    // Polishing
                    if (!street || typeof street !== 'string') {
                        street = `${c.district} (未明确街道)`;
                    } else if (!street.includes('办事处') && !street.includes('街道') && !street.includes('镇')) {
                        street += '街道办事处';
                    }

                    resolve({ street, adcode: c.adcode });
                } else {
                    resolve({ street: '查询失败', adcode: '' });
                }
            });
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => Controller.init());
