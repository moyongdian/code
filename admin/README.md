# 校园外卖点餐平台 — PC 管理后台

Vue 3 + Vite + Element Plus + Pinia + ECharts，对接 Go 后端（`../server`）。

## 启动

```bash
npm ci          # 或 npm install
npm run dev     # 默认 http://localhost:5173
```

后端需先运行在 `:9090`（vite 已配置 `/api` 代理到后端，见 `vite.config.js`）。
默认登录账号：`admin / admin123`。

---

## 后端字段契约（重要，易踩坑）

后台多个列表页直接渲染后端返回的嵌套对象，若按「字符串」使用会出现 **`[object Object]`**。下表为实际契约：

| 模型 | 字段 | 实际类型 | 正确写法 |
|---|---|---|---|
| `Orders` | `business` | **对象** `{id,name,...}` | `row.business.name` |
| `Orders` | `user` | 字符串（收货人） | `prop="user"` ✅ |
| `Comment` | `business` | **对象** | `row.business.name` |
| `Comment` | `user` | **对象** | `row.user.name` / `row.user.username` |
| `Comment` | `content` | 字符串 | `prop="content"`（不是 `contents`） |
| `Product` | `business` | 字符串（商家名） | `prop="business"` ✅ |
| `Logs` | `user` | 字符串 | `prop="user"` ✅ |
| `Address` | `user` | 字符串 | `prop="user"` ✅ |

### 历史缺陷（已修复）

`Order.vue` 与 `Comment.vue` 曾使用 `<el-table-column prop="business" />`，
由于后端返回的是对象，单元格渲染为 `[object Object]`。修复方式：

```html
<!-- 错误：对象被直接渲染 -->
<el-table-column prop="business" label="商家" />

<!-- 正确：取嵌套属性 -->
<el-table-column label="商家" width="130" show-overflow-tooltip>
  <template #default="{ row }">{{ row.business?.name || '—' }}</template>
</el-table-column>
```

同一页面还修正了：`prop="username"` → `row.user.name`（用户名列此前为空）、
`prop="contents"` → `prop="content"`（字段名拼写错误，此前内容列空白）。

---

## 验证脚本

### 表格列渲染验证

```bash
node admin/tools/verify-table-render.cjs     # 需后端运行在 :9090
```

从 SFC 提取模板 → 编译成渲染函数 → 用**真实后端数据**渲染 → 对每列求值，
输出单元格最终文本，校验是否出现 `[object Object]` 或字段取空。

覆盖 `Order.vue`、`Comment.vue`，并对 `Product.vue` / `Logs.vue` / `Address.vue`
做回归（这些页面的字段本就是字符串，不应受影响）。

> 该脚本需要后端有真实数据；脚本会自动登录 `admin/admin123` 取数。

---

## 已知遗留问题

- **评论列表的关键字搜索无效**：`Comment.vue` 传递 `contents` 作为查询参数，
  但后端 `CommentSelectByPage` 未实现任何关键字过滤（传 `content` / `contents`
  都返回全量）。需后端补上过滤逻辑，或前端改为本地过滤。
- **`project.private.config.json`** 是微信开发者工具类本地文件（本项目无关），
  已在根 `.gitignore` 中排除，避免个人设置被提交。
