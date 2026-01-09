## 长者安心地址助手

为老年人和家属设计的一个小工具，可以把一整段包含姓名、手机号、地址的文字，自动识别出其中的地址部分，并调用高德地图地理编码服务，将其转换为标准地址，并拆分为「省 / 市 / 区县 / 街道 / 小区等详细」几行显示，方便登记和录入系统。

### 功能特点

- **适老化界面**：大字号、大按钮、高对比度，适合手机和平板操作。
- **一键智能识别**：从杂糅文字中提取更像地址的那一段，自动调用高德地图解析。
- **标准化展示**：输出标准完整地址，以及省、市、区/县、街道/乡镇、小区/楼栋/门牌等信息。
- **纯静态网页**：可直接部署在 GitHub Pages，无需服务器。

### 目录结构

- `index.html`：主页面。
- `style.css`：样式文件（适老化 + 响应式）。
- `main.js`：前端逻辑，包含：
  - 混合文字中的地址粗略提取；
  - 调用高德 Web 服务地理编码接口；
  - 拆分省市区街道与小区/楼栋等详细信息。

### 本地预览

1. 在本机打开 `index.html` 即可用浏览器直接访问（推荐使用 Chrome、Edge、Safari 等现代浏览器）。
2. 如果浏览器限制本地文件发起网络请求，可以使用一个简单的本地 HTTP 服务，例如（任选其一）：

   ```bash
   # Python3
   cd /Users/alexandershang/Documents/cursorProgram/streetWeb
   python3 -m http.server 8000
   # 然后浏览器访问 http://localhost:8000
   ```

### 部署到 GitHub Pages

1. **创建仓库**
   - 登录 GitHub，新建一个公开仓库，例如：`street-address-helper`。
   - 将当前目录下的全部文件（`index.html`, `style.css`, `main.js`, `README.md` 等）推送到该仓库的 `main` 分支。

2. **开启 GitHub Pages**
   - 在 GitHub 上打开该仓库，点击 `Settings`。
   - 左侧选择 `Pages`。
   - 在 **Source** 一项中选择：
     - `Branch`: 选择 `main`
     - `Folder`: 选择 `/ (root)`
   - 点击 `Save`。

3. **访问地址**
   - 等待 1–3 分钟，GitHub 会自动构建。
   - 页面会显示一个访问链接，类似：
     - `https://你的GitHub用户名.github.io/street-address-helper`
   - 之后就可以把这个链接发给老人、家人或志愿者，使用手机或平板打开即可。

### 高德地图 Key 说明

本项目中使用的高德 JS API Key 和安全密钥已在 `index.html` 中写好，如需更换自己的 Key：

1. 登录高德开放平台，创建 Web 服务 / JS API 应用，获取新的 `Key` 与 `安全密钥`。
2. 在 `index.html` 中替换：
   - 顶部 `window.AMAP_CONFIG` 中的 `webKey` 与 `securityJsCode`；
   - 底部引用 JS SDK 的 `<script src="https://webapi.amap.com/maps?v=2.0&key=..."></script>` 里的 `key` 参数。

