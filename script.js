// script.js - Elderly-friendly street office lookup
// This script creates cascading dropdowns for province, city, county, village
// and queries AMap (高德) Geocoding API using a Key and Secret (signature).

// Utility: simple MD5 function placeholder (you need to include a library or implement server-side)
function md5(str) {
  // Placeholder: you should replace with a proper MD5 implementation or compute on server.
  console.warn('MD5 function is a placeholder. Compute signature on server for security.');
  return '';
}

// Initialize selectors
const provinceSelect = document.getElementById('provinceSelect');
const citySelect = document.getElementById('citySelect');
const countySelect = document.getElementById('countySelect');
const villageSelect = document.getElementById('villageSelect');
const searchBtn = document.getElementById('searchBtn');
const resultDiv = document.getElementById('result');
const extractBtn = document.getElementById('extractBtn');
const rawInput = document.getElementById('rawInput');

// Sample static data (you can replace with a full JSON dataset)
const data = {
  // province: { city: { county: [village, ...] } }
  "北京": {
    "北京市": {
      "东城区": ["东华门社区", "景山社区"],
      "西城区": ["西长安街社区"]
    }
  },
  "广东": {
    "广州市": {
      "天河区": ["天河街道", "华南街道"],
      "越秀区": ["越秀街道"]
    },
    "深圳市": {
      "南山区": ["南山街道"],
      "福田区": ["福田街道"]
    }
  }
};

function populateSelect(selectElem, options) {
  selectElem.innerHTML = '<option value="">请选择' + selectElem.id.replace('Select', '') + '</option>';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    selectElem.appendChild(o);
  });
  selectElem.disabled = false;
}

// 简单的地址清理函数，去除手机号、电话、邮箱、姓名等噪音，只保留中文地址部分
function cleanAddress(raw) {
  let cleaned = raw.replace(/[0-9\-+()（）]+/g, '');
  cleaned = cleaned.replace(/电话|手机|联系|邮箱|email|微信|QQ/gi, '');
  cleaned = cleaned.replace(/^([\u4e00-\u9fa5]{1,4})\s*(?=[省市县区镇乡])/g, '');
  cleaned = cleaned.replace(/\s+/g, '');
  return cleaned;
}

// 查询地址的通用函数
async function queryAddress(address) {
  resultDiv.textContent = '加载中...';
  const key = 'YOUR_KEY'; // 请在部署前替换为实际的 Key
  const secret = 'YOUR_SECRET'; // 请在部署前替换为实际的 Secret
  const baseUrl = 'https://restapi.amap.com/v3/geocode/geo';
  const params = `address=${encodeURIComponent(address)}&key=${key}`;
  const signature = md5(params + secret);
  const url = `${baseUrl}?${params}&sig=${signature}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const streetInfo = data.geocodes[0].streetNumber || {};
      const street = streetInfo.street || '';
      const match = street.match(/([^\s]*街道)/);
      resultDiv.textContent = match ? match[1] : '未找到街道信息';
    } else {
      resultDiv.textContent = '未找到结果';
    }
  } catch (e) {
    console.error(e);
    resultDiv.textContent = '查询出错';
  }
}

// Populate provinces on load
window.addEventListener('load', () => {
  populateSelect(provinceSelect, Object.keys(data));
});

provinceSelect.addEventListener('change', () => {
  const province = provinceSelect.value;
  resetSelect(citySelect);
  resetSelect(countySelect);
  resetSelect(villageSelect);
  searchBtn.disabled = true;
  if (province) {
    populateSelect(citySelect, Object.keys(data[province]));
  }
});

citySelect.addEventListener('change', () => {
  const province = provinceSelect.value;
  const city = citySelect.value;
  resetSelect(countySelect);
  resetSelect(villageSelect);
  searchBtn.disabled = true;
  if (city) {
    populateSelect(countySelect, Object.keys(data[province][city]));
  }
});

countySelect.addEventListener('change', () => {
  const province = provinceSelect.value;
  const city = citySelect.value;
  const county = countySelect.value;
  resetSelect(villageSelect);
  searchBtn.disabled = true;
  if (county) {
    populateSelect(villageSelect, data[province][city][county]);
  }
});

villageSelect.addEventListener('change', () => {
  searchBtn.disabled = !villageSelect.value;
});

function resetSelect(selectElem) {
  selectElem.innerHTML = '<option value="">请选择' + selectElem.id.replace('Select', '') + '</option>';
  selectElem.disabled = true;
}

searchBtn.addEventListener('click', async () => {
  const province = provinceSelect.value;
  const city = citySelect.value;
  const county = countySelect.value;
  const village = villageSelect.value;
  const address = `${village}${county}${city}${province}`;
  await queryAddress(address);
});

extractBtn.addEventListener('click', async () => {
  const raw = rawInput.value.trim();
  if (!raw) {
    resultDiv.textContent = '请粘贴包含地址的文本';
    return;
  }
  const cleaned = cleanAddress(raw);
  if (!cleaned) {
    resultDiv.textContent = '未能提取有效地址';
    return;
  }
  await queryAddress(cleaned);
});
