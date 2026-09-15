# 设计系统（极简科技风）

## 技术选型（均为小程序生态方案）

| 用途 | 选型 | 说明 |
|---|---|---|
| UI 组件 | `@vant/weapp` 1.11.x | 原生小程序组件，**dist 按需闭包**（33 个组件 / 163 KB）直接放入 `vant/`，用相对路径引用，**无需开发者工具执行「构建 npm」** |
| 图标 | `@vant/icons` | 257 个图标。字体以 **woff2 base64 内嵌**（约 25 KB）写入 `vant/icon/index.wxss` |
| tabBar 图标 | 自绘 PNG | 极简线性几何图形，脚本生成，74–1001 字节 |

### 兼容性要点（踩过的坑）

1. **字体不能外链**：小程序无法加载本地字体文件；Vant 官方样式默认指向
   `//at.alicdn.com/...`，该 CDN 在真机上不可靠且无法加入 `@font-face` 白名单。
   必须使用 base64 内嵌（本项目的 `vant/icon/index.wxss` 已内嵌）。
2. **不要用 Web 端图标库**（如 `@vant/icons` 的 less 源码、`iconfont` 在线 CSS、
   FontAwesome CDN、SVG sprite），小程序均不支持。
3. **`wx.showToast` 的 `icon` 取值只有** `none|success|loading|error`，
   不能传 Vant 图标名。
4. **组件引用不要依赖 `miniprogram_npm`**：那需要开发者在工具里手动「构建 npm」，
   容易漏做导致组件全白。本项目改为直接引用 `vant/xxx/index`。
5. **WXML 表达式能力弱**：不支持 `{{(a||b)[0]}}`、`.slice()`、`.toFixed()` 等，
   需在 JS 中预计算（见 `tools/check.py` 的静态校验）。

## 设计令牌

全部定义在 `app.wxss` 的 `page` 选择器上，页面样式只引用变量。

### 色彩

| 令牌 | 值 | 用途 |
|---|---|---|
| `--bg` | `#0a0e17` | 页面底色（近黑蓝） |
| `--surface` | `#151b28` | 卡片面 |
| `--surface-2` | `#1c2433` | 输入框 / 次级面 |
| `--surface-3` | `#232d40` | 悬浮 / 选中态 |
| `--border` | `#202a3c` | 1rpx 细描边 |
| `--text` / `--text-2` / `--text-3` | `#e8edf7` / `#9aa7bd` / `#63708a` | 主 / 次 / 弱文本 |
| `--accent` | `#22d3ee` | 品牌主色（青） |
| `--grad-accent` | `135deg, #22d3ee → #3b82f6` | 主按钮 / 强调渐变 |
| `--warn` / `--danger` / `--success` | `#fbbf24` / `#f87171` / `#34d399` | 语义色 |

### 形状与节奏

- 圆角：`--r-sm 10` / `--r-md 16` / `--r-lg 24` / `--r-xl 32` / `--r-pill`
- 间距：`--sp-1..5` = 8 / 16 / 24 / 32 / 48rpx
- 字号：`--fs-xs..2xl` = 20 / 24 / 28 / 32 / 40 / 52rpx

### 视觉手法（替代「经典」观感）

- **细描边 + 微光**替代重投影：卡片用 1rpx 边框，主行动区用主色低透明度叠加
- **等宽数字**：价格 / 金额使用 `--price` + monospace，科技感关键细节
- **无 emoji**：全部改为 Vant 矢量图标，风格统一
- **主色短线区块标题**：`.block-title::before`
- **状态点**：营业中用带光晕的小圆点（`box-shadow`）
- **列表结束标记**：`END OF LIST` + 两侧细线

## 校验

```bash
python3 miniprogram/tools/check.py    # 静态：WXML 表达式 / 组件引用 / 图标名 / 结构
node miniprogram/tools/verify.js      # 联调：真实请求打到后端
```

`check.py` 会校验：
- WXML 中不支持的表达式写法
- `usingComponents` 引用的路径是否存在、WXML 用到的组件是否注册
- **`van-icon` 的 name 是否为真实存在的图标**（写错会静默空白）
- tabBar 图标与页面文件完整性
