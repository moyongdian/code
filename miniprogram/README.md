# 校园外卖点餐平台 — 微信小程序（用户端）

基于《功能说明书》第 4.2 节实现的**原生微信小程序**用户端，与 Go 后端（`../server`）联调通过。

## 一、快速开始

### 1. 启动后端

```bash
cd ../server
go mod tidy
go run .            # 或 ./server，监听 :9090
```

后端启动后会自动创建 SQLite 库并写入种子数据。

### 2. 用微信开发者工具导入

1. 打开**微信开发者工具** → 导入项目
2. **目录**选择仓库根目录（含 `project.config.json` 的那一层，即 `code/`）
3. **AppID**：填你自己的小程序 AppID；没有就点「测试号」
4. 导入后进入 **详情 → 本地设置**，勾选：
   - ✅ **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**

> 第 4 步是本地联调的关键：小程序默认只允许 HTTPS 且域名需备案，而本地后端是 `http://localhost:9090`。

### 3. 修改后端地址

编辑 `app.js`：

```js
globalData: {
  baseUrl: 'http://localhost:9090',   // 改成你的后端地址
}
```

- 模拟器调试：`http://localhost:9090` 即可
- **真机预览**：`localhost` 指向手机自身，必须改成电脑的局域网 IP，例如 `http://192.168.1.10:9090`，并确保手机与电脑同一网络

### 4. 测试账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 普通用户 | `test` | `123456` |
| 商家店主 | `shop` | `123456` |
| 管理员 | `admin` | `admin123` |

登录页底部提供**点击填充**的测试账号，方便联调。

---

## 二、工程结构

```
miniprogram/
├── app.js / app.json / app.wxss     # 全局逻辑、页面与 tabBar 注册、全局样式
├── project.config.json              # 开发者工具项目配置（AppID 占位）
├── sitemap.json
├── images/                          # tabBar 图标（PNG，脚本生成）
├── api/index.js                     # 后端接口封装（按业务域分组）
├── utils/
│   ├── request.js                   # 请求封装：解包 {code,msg,data}、401 自动跳登录、上传
│   ├── auth.js                      # 登录态（token / 用户信息）本地缓存
│   └── util.js                      # 金额、状态映射、手机号/身份证校验、富文本处理
├── tools/verify.js                  # 联调测试台（Node，桩 wx.* 跑真实页面逻辑）
└── pages/                           # 19 个页面
```

### 页面清单（19 页）

| 分类 | 页面 | 说明 |
|---|---|---|
| 入口 | `index` | 首页：搜索、轮播、公告轮播、分类入口、商家列表（tab） |
| 认证 | `login` `register` `reset` | 登录、注册、忘记密码 |
| 点餐 | `detail` | 商家详情：分类导航 + 商品列表 + 评价 + 购物车弹层 + 收藏 |
| | `product` | 商品搜索（关键词过滤） |
| | `cart` | 购物车（按商家分组、加减、清空、分组结算） |
| | `confirm` | 确认订单：地址、费用明细、支付方式、备注、提交 |
| 订单 | `orders` | 订单列表（全部/进行中/待评价/退款）+ 状态化操作按钮（tab） |
| | `ordersItem` | 订单详情：明细、优惠、收货信息、订单信息 |
| | `comment` | 发表评价（星级 + 内容） |
| 我的 | `me` | 个人中心：订单角标、功能入口、退出登录（tab） |
| | `address` `addressEdit` | 地址列表（可选中回传）、新增/编辑 |
| | `collect` | 我的收藏 |
| | `myComment` | 我的评价 |
| | `person` | 个人信息（含头像上传） |
| | `editPassword` | 修改密码 |
| | `about` | 关于我们 / 用户协议 |

---

## 三、与后端的接口对应

所有接口走 `api/index.js`，统一解包 `{code, msg, data}`：

- `code === 200` → resolve(`data`)
- `code === 401` → 清除登录态并跳转登录页
- 其它 → reject(Error(msg)) 并 toast

| 业务 | 接口 |
|---|---|
| 认证 | `POST /login`、`POST /appRegister`、`PUT /password`、`PUT /user/updatePassword`、`PUT /user/update`、`GET /user/selectById/:id` |
| 商家 | `GET /business/selectAllApp`、`GET /business/selectById/:id` |
| 分类/商品 | `GET /category/selectAllByBid/:bid`、`GET /product/selectAllByCid/:cid`、`GET /product/selectByApp` |
| 购物车 | `POST /cart/add`、`GET /cart/selectAll/:bid/:uid`、`GET /cart/selectAllApp`、`PUT /cart/update`、`DELETE /cart/delete/:id`、`DELETE /cart/deleteByBid/:bid/:uid`、`GET /cart/calc` |
| 订单 | `POST /orders/addOrder`、`GET /orders/selectOrders/:uid/:status`、`GET /orders/selectById/:id`、`PUT /orders/update`、`DELETE /orders/delete/:id`、`GET /orderItem/selectByOrderId/:orderId` |
| 地址 | `GET /address/selectAll/:uid`、`GET /address/selectById/:id`、`POST /address/add`、`PUT /address/update`、`DELETE /address/delete/:id` |
| 收藏 | `GET /collect/selectByUid/:uid`、`GET /collect/selectByUidBid/:uid/:bid`、`POST /collect/add`、`PUT /collect/update` |
| 评论 | `GET /comment/selectAllByBid/:bid`、`GET /comment/selectAllByUid/:uid`、`POST /comment/add`、`DELETE /comment/delete/:id` |
| 内容 | `GET /notice/selectAllApp`、`GET /banners/selectAll` |
| 文件 | `POST /file/upload` |

### 联调中确认的接口行为（与说明书描述不同，以实际后端为准）

这几处容易踩坑，已按**实测**实现：

1. **`/collect/selectByUid/:uid` 返回的是商家列表**（`Business[]`，后端已按 `is_collect=1` 过滤），不是收藏记录数组。前端不应再按 `isCollect` 过滤。
2. **`/cart/calc` 返回一个数字**（实付合计），不是对象。
3. **订单明细不含 `pid`**：`Ordersitem` 只有商品快照（`productName`/`price`/`num`）。因此「再来一单」按**商品名反查**该商家商品列表来还原购物车。
4. **`AddressUpdate` 使用全字段覆盖**（`Save`），更新时必须回传 `userId`，否则会被清零。
5. **`collect/update` 用 `bid` 而非 `id`** 来取消收藏。
6. **分类/商品的增删改按 token 中的 uid 反查商家**，因此只有商家账号（`shop`）能操作，管理员调用会被拒绝（属预期行为）。
7. **注册限制**：用户名 ≤ 10 字符、密码 ≤ 20 字符（前后端均已校验）。
8. **`/user/selectById` 返回的 `token` 为空字符串**。合并用户信息到本地缓存时**必须保留原 token**，否则会把登录态覆盖掉（此坑已修，见下节回归项）。

---

## 四、联调测试台

微信开发者工具无法在无图形环境运行，因此提供 `tools/verify.js`：它桩掉 `wx.*` API，**直接加载真实的页面 JS、`api`、`utils`，打到运行中的后端**，验证数据契约与页面逻辑。

```bash
# 后端需先运行在 :9090
node miniprogram/tools/verify.js
```

覆盖 13 组、64 项断言：登录 → 首页 → 商家详情 → 加购/改量/收藏 → 购物车 → 地址 CRUD → 确认订单金额 → 下单事务 → 订单状态流转（待支付→待发货→已完成）→ 评价 → 收藏/我的评价 → 个人中心 → 未登录拦截 → 数据清理。测试会自动清理产生的数据。

---

## 五、联调中修复的后端缺陷（重要）

### 1. `PUT /user/update` 会清空密码并锁死账号（已修复）

**原行为**：`userUpdate` 无条件把 `hashed(u.Password)` 写回 `password` 列，而 `hashed("")` 返回 `""`。因此只要调用一次「更新个人信息」（不带密码），就会：

| 现象 | 修复前 |
|---|---|
| `password` 列 | 被写成空字符串 |
| 原密码登录 | ❌ 失败（账号被锁死） |
| 旧 token | ❌ 失效（`tokenVersion` 被自增） |

**修复**（`server/pkg/handler/user.go`）：仅当请求确实携带密码时，才把 `password`/`token_version` 纳入更新列；否则只更新资料字段。

**修复后验证**：更新资料后原密码仍可登录、旧 token 仍有效；而显式传密码改密时，新密码生效、旧密码失效、旧 token 失效（安全语义保留）。

### 2. 前端：本地缓存 token 被空 token 覆盖（已修复）

`me.refreshProfile` / `person.submit` 用 `Object.assign` 合并 `/user/selectById` 的结果时，响应里的空 `token` 会覆盖本地有效 token，导致刷新后所有鉴权请求 401。已在合并时显式保留原 token，并在测试台加了回归断言。

---

## 六、已知限制

- **未实现的说明书接口**：`/collect/selectByUidBid` 在说明书中写作 `/collect/selectByUidBid`，实际后端为 `/collect/selectByUidBid/:uid/:bid`（已按实际调用）。
- **商品搜索为前端过滤**：后端无关键词搜索接口，`/product/selectByApp` 取全量后在前端按名称/描述/商家/分类过滤。数据量大时建议后端加搜索接口。
- **骑手端未实现**：本轮只做用户端。后端 `/deliveryman/add`、`/orders/selectTakeout` 已就绪，个人中心在用户 `realStatus` 为真时显示「外卖接单」入口（当前提示待开放）。
- **支付为模拟**：无真实微信支付，点「去支付」即把订单状态置为 `待发货`（后端自动记录 `payTime`）。
- **`token` 存储**：使用 `wx.setStorageSync`。生产环境建议配合 `wx.login` + 后端 `code2Session` 换取会话。

## 七、发布前必做

1. 将 `app.js` 的 `baseUrl` 改为**已备案的 HTTPS 域名**
2. 微信公众平台 → 开发管理 → 服务器域名 → 把该域名加入 **request 合法域名**
3. 把 `project.config.json` 中的占位 AppID（`wx0000000000000000`）换成正式 AppID
