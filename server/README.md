# 校园外卖点餐平台 — Go 后端

基于《校园外卖点餐平台功能说明书》使用 **Go (Gin + GORM)** 实现的后端服务，覆盖用户点餐、商家经营、骑手配送、平台管理四条业务线。配套前端：Vue 管理后台（myvue）与 UniApp 移动端（uniapp）。

## 技术栈

- Go 1.21+，Web 框架 [Gin]
- ORM [GORM] —— 默认 **SQLite**（开箱即用，零依赖），可切换 **MySQL**
- JWT 鉴权（golang-jwt）、bcrypt 密码加密、AOP 式操作日志中间件
- 雪花订单号（sony/snowflake）、decimal 金额计算（7 折优惠）
- Excel 导入导出（excelize）、文件上传/下载/预览

## 快速开始

```bash
# 1. 安装依赖
go mod tidy

# 2. 运行（自动创建 SQLite 数据库 data/honey2024.db 与种子数据）
go run .
# 或编译后运行
go build -o server.exe .
./server.exe
```

服务默认监听 `:9090`。切换 MySQL：修改 `config.yaml` 中 `database.driver = mysql` 并填写 DSN。

### 种子账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | admin | admin123 |
| 普通用户 | test | 123456 |
| 商家店主 | shop | 123456 |

### 验证接口

```bash
curl -X POST http://localhost:9090/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

## 目录结构

```
server/
├── main.go                  # 入口
├── config.yaml              # 配置文件
├── pkg/
│   ├── config/              # 配置加载
│   ├── core/                # 统一响应体、分页
│   ├── models/              # GORM 模型 + 建表 + 种子数据
│   ├── utils/               # JWT / 雪花ID / 密码 / 文件 / Excel / 金额
│   ├── middleware/          # CORS / Recovery / JWT / 操作日志
│   ├── handler/             # 各业务模块接口
│   └── router/              # 路由注册（公开组 / 鉴权组）
└── data/                    # SQLite 数据文件（运行时生成）
```

## 接口约定

- 统一响应：`{code, msg, data}`（`200` 成功 / `401` 认证失效 / `500` 错误）
- 除登录、注册、重置密码、轮播图、文件上传下载外，均需请求头携带 `token`
- 分页入参：`pageNum` / `pageSize`，返回 `{records, total}`

主要接口分组：`/user` `/admin` `/business` `/category` `/product` `/cart` `/orders` `/orderItem` `/address` `/comment` `/collect` `/notice` `/news` `/logs` `/file` `/deliveryman` `/banner` `/charts` `/dashboard`

## 核心业务

- **下单流程**：加购（同商品累加）→ 确认订单 → `/orders/addOrder`（事务内生成订单+明细+清空购物车）→ 支付（状态置"待发货"，自动记录支付时间）→ 确认收货 → 评价
- **7 折优惠**：`realPrice = price × 0.7`，购物车、订单、明细统一由后端 decimal 计算
- **骑手接单**：实名认证（`/deliveryman/add`）→ `/orders/selectTakeout` 查看待接订单 → 接单更新状态并绑定骑手
- **操作日志**：中间件在执行成功后异步写入 `logs` 表，记录模块/类型/IP/操作人

## 安全说明

- 密码 bcrypt 哈希存储；JWT 载荷绑定 `tokenVersion`，修改密码后旧 token 自动失效
- 本服务登录响应保留 `password` 字段以兼容既有前端缓存逻辑，**生产部署建议移除**（前端改密改为走 `/user/updatePassword`）
- 生产环境通过环境变量注入密钥：`JWT_SECRET`、`DB_DRIVER`、`DB_DSN`

[Gin]: https://github.com/gin-gonic/gin
[GORM]: https://gorm.io/