// 简单工具函数：去除首尾空白
function trim(str) {
  return (str || "").replace(/^\s+|\s+$/g, "");
}

// 从整段文字中尽量提取“更像地址”的部分
function extractAddressSegment(raw) {
  if (!raw) return "";
  let text = raw.replace(/\s+/g, " ");

  // 去掉手机号（支持国内 11 位手机号和带区号的座机）
  text = text.replace(
    /((\+?86[-\s]?)?1[3-9]\d{9})|(\d{3,4}[-\s]?\d{7,8})/g,
    " "
  );

  // 去掉常见称呼（先生/女士/老师等）前的姓名（很粗糙，只为减弱干扰）
  text = text.replace(/[\\u4e00-\\u9fa5]{1,4}(先生|女士|老师|老板|阿姨|叔叔)/g, " ");

  // 分隔符切分：逗号、顿号、分号、换行
  const parts = text.split(/[,，、；;\\n]/).map((p) => trim(p));

  // 优先选择含有“省市区县路街道村镇号栋楼室区”等关键字的片段
  const addrKeywords =
    /省|市|区|县|镇|乡|村|街|路|道|巷|号|栋|楼|单元|室|小区|花园|广场|园|幢/;

  let candidate = "";

  for (const part of parts) {
    if (!part) continue;
    if (addrKeywords.test(part) && part.length >= 4) {
      if (!candidate || part.length > candidate.length) {
        candidate = part;
      }
    }
  }

  if (candidate) return candidate;

  // 如果没有明显的地址关键字，退化为返回最长的一段
  let longest = "";
  for (const part of parts) {
    if (part.length > longest.length) {
      longest = part;
    }
  }
  return longest;
}

async function geocodeByAmap(address) {
  const key = (window.AMAP_CONFIG && window.AMAP_CONFIG.webKey) || "";
  if (!key) {
    throw new Error("缺少高德地图 Key 配置");
  }

  const url =
    "https://restapi.amap.com/v3/geocode/geo?key=" +
    encodeURIComponent(key) +
    "&address=" +
    encodeURIComponent(address);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("网络请求失败，请稍后再试");
  }
  const data = await res.json();
  if (data.status !== "1" || !data.geocodes || data.geocodes.length === 0) {
    throw new Error(data.info || "未能找到对应的地址，请尝试简化或修改后再试");
  }
  return data.geocodes[0];
}

function splitDetailAddress(geo) {
  const province = geo.province || "";
  const city = geo.city && geo.city !== "[] " ? geo.city : "";
  const district = geo.district || "";
  const township = geo.township || "";

  const full = geo.formatted_address || "";

  // 尝试去掉“省 市 区/县 街道”前缀后得到更细的“小区/楼栋/门牌等”
  let prefix = province + city + district + township;
  let neighborhood = "";
  if (prefix && full.startsWith(prefix)) {
    neighborhood = full.slice(prefix.length);
  } else {
    // 前缀不规则时，退化为从 district 开始截断
    if (district && full.includes(district)) {
      const idx = full.indexOf(district) + district.length;
      neighborhood = full.slice(idx);
    } else if (city && full.includes(city)) {
      const idx = full.indexOf(city) + city.length;
      neighborhood = full.slice(idx);
    } else {
      neighborhood = "";
    }
  }

  neighborhood = trim(neighborhood);

  return {
    province,
    city,
    district,
    township,
    neighborhood: neighborhood || "（未能精准拆分，详见上方完整地址）",
    formatted: full,
  };
}

function setText(id, text, isPlaceholder) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (isPlaceholder) {
    el.classList.add("placeholder");
  } else {
    el.classList.remove("placeholder");
  }
}

function setStatus(type, text) {
  const el = document.getElementById("statusMessage");
  if (!el) return;
  el.textContent = text;
  el.className = "status-message";
  if (type) {
    el.classList.add(type);
  }
}

function bindEvents() {
  const btn = document.getElementById("analyzeBtn");
  const input = document.getElementById("rawInput");
  if (!btn || !input) return;

  btn.addEventListener("click", async () => {
    const raw = trim(input.value);
    if (!raw) {
      setStatus("error", "请先粘贴或输入包含地址的文字。");
      return;
    }

    const detected = extractAddressSegment(raw);
    if (!detected) {
      setStatus("error", "没有在文字中找到明显的地址信息，请减少无关内容后再试。");
      setText("detectedAddress", "未能识别出地址部分", true);
      return;
    }

    setText("detectedAddress", detected, false);
    setStatus("info", "正在通过高德地图识别地址，请稍候...");
    btn.disabled = true;

    try {
      const geo = await geocodeByAmap(detected);
      const detail = splitDetailAddress(geo);

      setText("formattedAddress", detail.formatted, false);
      setText("province", detail.province || "-", !detail.province);
      setText("city", detail.city || "-", !detail.city);
      setText("district", detail.district || "-", !detail.district);
      setText("township", detail.township || "-", !detail.township);
      setText("neighborhood", detail.neighborhood, false);
      setStatus("success", "识别完成，请确认下方地址信息是否正确。");
    } catch (err) {
      console.error(err);
      setStatus("error", err.message || "识别失败，请稍后再试。");
    } finally {
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", bindEvents);

