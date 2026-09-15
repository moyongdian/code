#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
校园外卖点餐平台 — 后端 API 冒烟测试（按真实 handler 契约编写）
仅用 Python 标准库，对运行中的 http://localhost:9090 做端到端验证。
"""
import json
import random
import sys
import urllib.error
import urllib.request
import uuid

BASE = "http://localhost:9090"
PASS, FAIL, SKIP = [], [], []


def call(method, path, token=None, body=None, raw=False, timeout=25):
    url = BASE + path
    data, headers = None, {}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["token"] = token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            payload = r.read()
            if raw:
                return r.status, payload
            try:
                return r.status, json.loads(payload)
            except Exception:
                return r.status, payload
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            return e.code, json.loads(payload)
        except Exception:
            return e.code, payload
    except Exception as e:
        return 0, {"_error": str(e)}


def ok(st, r):
    return st == 200 and isinstance(r, dict) and r.get("code") == 200


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f"   {detail}" if detail else ""))


def section(t):
    print(f"\n{'='*70}\n{t}\n{'='*70}")


def login(u, p):
    st, r = call("POST", "/login", body={"username": u, "password": p})
    return (r.get("data") or {}).get("token", "") if ok(st, r) else ""


# ===================== 1. 公开接口 =====================
section("1. 服务可达性与公开接口")
st, r = call("GET", "/health")
check("GET /health", st == 200 and (r.get("data") or {}).get("status") == "up", f"HTTP {st}")

st, r = call("GET", "/")
check("GET / 接口索引", st == 200 and isinstance(r, dict) and r.get("status") == "running",
      f"HTTP {st} name={r.get('name') if isinstance(r,dict) else ''}")

st, r = call("GET", "/banners/selectAll")
check("GET /banners/selectAll", ok(st, r), f"HTTP {st}")

st, r = call("GET", "/business/selectAllApp")
n = len(r.get("data") or []) if isinstance(r, dict) else -1
check("GET /business/selectAllApp 商家列表", ok(st, r) and n >= 1, f"商家数={n}")

st, r = call("GET", "/product/selectByApp")
check("GET /product/selectByApp 商品列表", ok(st, r), f"HTTP {st}")

st, r = call("GET", "/notice/selectAllApp")
check("GET /notice/selectAllApp 公告", ok(st, r), f"HTTP {st}")

st, r = call("GET", "/news/selectNewsData")
check("GET /news/selectNewsData 新闻", ok(st, r), f"HTTP {st}")

# ===================== 2. 登录 =====================
section("2. 认证：三角色登录 + 负例")
tokens = {}
for u, p, label in [("admin", "admin123", "管理员"), ("test", "123456", "用户"), ("shop", "123456", "商家")]:
    tk = login(u, p)
    tokens[u] = tk
    check(f"登录 {u} ({label})", len(tk) > 50, f"token长度={len(tk)}")

st, r = call("POST", "/login", body={"username": "admin", "password": "wrong"})
check("错误密码被拒绝", not ok(st, r), f"HTTP {st} code={r.get('code') if isinstance(r,dict) else '?'}")

st, r = call("POST", "/login", body={"username": "ghost_user_zzz", "password": "x"})
check("不存在用户被拒绝", not ok(st, r), f"HTTP {st}")

admin, user, shop = tokens["admin"], tokens["test"], tokens["shop"]

# ===================== 3. 鉴权防护 =====================
section("3. 鉴权防护")
st, r = call("GET", "/user/selectByPage?pageNum=1&pageSize=5")
check("无 token 被拒(401)", st == 401 or (isinstance(r, dict) and r.get("code") == 401), f"HTTP {st}")

st, r = call("GET", "/user/selectByPage?pageNum=1&pageSize=5", token="fake.jwt.token")
check("伪造 token 被拒(401)", st == 401 or (isinstance(r, dict) and r.get("code") == 401), f"HTTP {st}")

# ===================== 4. 查询接口 =====================
section("4. 管理端查询接口")
for path in ["/user/selectByPage", "/admin/selectByPage", "/business/selectByPage",
             "/category/selectByPage", "/product/selectByPage", "/orders/selectByPage",
             "/address/selectByPage", "/comment/selectByPage", "/notice/selectByPage",
             "/news/selectByPage", "/logs/selectByPage"]:
    st, r = call("GET", f"{path}?pageNum=1&pageSize=5", token=admin)
    total = (r.get("data") or {}).get("total") if ok(st, r) else "?"
    check(f"GET {path}", ok(st, r), f"total={total}")

for path in ["/user/selectAll", "/business/selectAll", "/category/selectAll", "/product/selectAll",
             "/orders/selectAll", "/orderItem/selectAll", "/banners/selectAll",
             "/admin/selectAll", "/comment/selectAll", "/notice/selectAll", "/news/selectAll"]:
    st, r = call("GET", path, token=admin)
    cnt = len(r.get("data") or []) if ok(st, r) else "?"
    check(f"GET {path}", ok(st, r), f"条数={cnt}")

st, r = call("GET", "/dashboard", token=admin)
d = r.get("data") or {} if isinstance(r, dict) else {}
check("GET /dashboard 统计", st == 200 and "userCount" in d,
      f"用户={d.get('userCount')} 商家={d.get('businessCount')} 订单={d.get('orderCount')}")

st, r = call("GET", "/charts", token=admin)
check("GET /charts 图表", ok(st, r), f"HTTP {st}")

st, r = call("GET", "/user/selectById/1", token=admin)
check("GET /user/selectById/:id", ok(st, r), f"HTTP {st}")

# ===================== 5. 分类/商品 CRUD（商家账号操作） =====================
section("5. CRUD：分类与商品（以商家 shop 身份）")
# 说明：CategoryAdd/ProductAdd 按 token 中的 uid 反查 business，因此必须用商家账号
st, r = call("POST", "/category/add", token=shop, body={"name": "自动化测试分类", "sort": 999})
check("POST /category/add 新增分类(shop)", ok(st, r),
      f"HTTP {st} msg={r.get('msg') if isinstance(r,dict) else ''}")

cat_id = None
st, r = call("GET", "/category/selectAllByBid/1", token=admin)
for it in (r.get("data") or []):
    if it.get("name") == "自动化测试分类":
        cat_id = it.get("id")
check("新分类可查到", cat_id is not None, f"id={cat_id}")

# 管理员无权新增分类（无关联商家）——负例
st, r = call("POST", "/category/add", token=admin, body={"name": "管理员不该能建分类", "bid": 1})
check("管理员无商家时被拒绝(负例)", not ok(st, r),
      f"HTTP {st} msg={r.get('msg') if isinstance(r,dict) else ''}")

prod_id = None
if cat_id:
    st, r = call("PUT", "/category/update", token=shop,
                 body={"id": cat_id, "name": "自动化测试分类_改", "sort": 998})
    check("PUT /category/update 修改分类", ok(st, r), f"HTTP {st}")

    st, r = call("POST", "/product/add", token=shop,
                 body={"name": "自动化测试商品", "cid": cat_id, "price": 12.5,
                       "stock": 88, "info": "测试用", "status": "上架"})
    check("POST /product/add 新增商品(shop)", ok(st, r),
          f"HTTP {st} msg={r.get('msg') if isinstance(r,dict) else ''}")

    st, r = call("GET", "/product/selectAll", token=admin)
    for it in (r.get("data") or []):
        if it.get("name") == "自动化测试商品":
            prod_id = it.get("id")
    check("新商品可查到", prod_id is not None, f"id={prod_id}")

    # 清理商品与分类
    if prod_id:
        st, r = call("DELETE", f"/product/delete/{prod_id}", token=admin)
        check("DELETE /product/delete/:id 清理商品", ok(st, r), f"HTTP {st}")
    st, r = call("DELETE", f"/category/delete/{cat_id}", token=admin)
    check("DELETE /category/delete/:id 清理分类", ok(st, r), f"HTTP {st}")

# ===================== 6. 核心业务流 =====================
section("6. 核心业务流：注册 → 加购 → 改密 → 下单 → 支付 → 评价")
uname = f"at{random.randint(100000, 999999)}"   # 用户名须 ≤10 字符
st, r = call("POST", "/register", body={"username": uname, "password": "test123456", "name": "自动化测试"})
check(f"POST /register 注册({uname})", ok(st, r), f"HTTP {st} msg={r.get('msg') if isinstance(r,dict) else ''}")

newtok = login(uname, "test123456")
check("新用户可登录", len(newtok) > 50, f"token长度={len(newtok)}")

# 用户名重复应被拒
st, r = call("POST", "/register", body={"username": uname, "password": "test123456"})
check("重复用户名被拒绝", not ok(st, r), f"HTTP {st}")

# 用户名超长应被拒
st, r = call("POST", "/register", body={"username": "way_too_long_username", "password": "x"})
check("超长用户名被拒绝", not ok(st, r), f"HTTP {st}")

new_uid = None
st, r = call("GET", "/user/selectByPage?pageNum=1&pageSize=200", token=admin)
for it in ((r.get("data") or {}).get("records") or []):
    if it.get("username") == uname:
        new_uid = it.get("id")
check("新用户出现在列表", new_uid is not None, f"uid={new_uid}")

# 取一个可售商品（记录其所属商家）
prod, bid = None, None
st, r = call("GET", "/product/selectAll", token=admin)
for it in (r.get("data") or []):
    if it.get("bid"):
        prod, bid = it, it.get("bid")
        break
check("存在可下单商品", prod is not None, f"商品={prod.get('name') if prod else None} 商家={bid}")

addr_id = order_id = None
if newtok and new_uid and prod:
    pid = prod["id"]

    st, r = call("POST", "/cart/add", token=newtok, body={"pid": pid, "bid": bid, "uid": new_uid, "num": 2})
    check("POST /cart/add 加入购物车", ok(st, r), f"HTTP {st}")

    st, r = call("GET", f"/cart/selectAll/{bid}/{new_uid}", token=newtok)
    check("GET /cart/selectAll 查询购物车", ok(st, r) and len(r.get("data") or []) >= 1,
          f"条目={len(r.get('data') or []) if ok(st,r) else '?'}")

    st, r = call("GET", f"/cart/calc?uid={new_uid}&bid={bid}", token=newtok)
    check("GET /cart/calc 金额计算(7折)", ok(st, r), f"data={str(r.get('data'))[:70] if isinstance(r,dict) else ''}")

    st, r = call("POST", "/address/add", token=newtok,
                 body={"address": "自动化测试地址1号", "user": "测试收货人", "phone": "13900000001",
                       "userId": new_uid})
    check("POST /address/add 新增地址", ok(st, r), f"HTTP {st}")

    st, r = call("GET", f"/address/selectAll/{new_uid}", token=newtok)
    for it in (r.get("data") or []):
        if it.get("address") == "自动化测试地址1号":
            addr_id = it.get("id")
    check("地址可查询", addr_id is not None, f"addressId={addr_id}")

    if addr_id:
        st, r = call("POST", "/orders/addOrder", token=newtok,
                     body={"bid": bid, "user": "测试收货人", "addressId": addr_id,
                           "phone": "13900000001", "comment": "自动化测试订单", "payType": "微信"})
        check("POST /orders/addOrder 下单", ok(st, r), f"HTTP {st} msg={r.get('msg') if isinstance(r,dict) else ''}")

    st, r = call("GET", "/orders/selectByPage?pageNum=1&pageSize=200", token=admin)
    for it in ((r.get("data") or {}).get("records") or []):
        if it.get("uid") == new_uid:
            order_id = it.get("id")
            order_no, order_actual = it.get("orderNo"), it.get("actual")
    check("订单出现在订单列表", order_id is not None, f"orderId={order_id} orderNo={order_no if order_id else ''}")

    if order_id:
        st, r = call("GET", f"/orders/selectById/{order_id}", token=admin)
        check("GET /orders/selectById 订单详情", ok(st, r), f"HTTP {st}")

        st, r = call("GET", f"/orderItem/selectByOrderId/{order_id}", token=admin)
        items = r.get("data") or []
        check("订单明细已生成", ok(st, r) and len(items) >= 1, f"明细={len(items)}条")

        # 7 折校验：actual ≈ amount * 0.7
        st, r = call("GET", f"/orders/selectById/{order_id}", token=admin)
        od = r.get("data") or {}
        try:
            amount, actual = float(od.get("amount") or 0), float(od.get("actual") or 0)
            if amount > 0:
                ratio = actual / amount
                check("7 折金额比例正确(0.70)", abs(ratio - 0.7) < 0.02,
                      f"amount={amount} actual={actual} 比例={ratio:.4f}")
            else:
                SKIP.append("订单 amount 为 0，跳过 7 折校验")
        except Exception as e:
            SKIP.append(f"7折校验异常 {e}")

        st, r = call("PUT", "/orders/update", token=admin, body={"id": order_id, "status": "待发货"})
        check("PUT /orders/update 支付改状态", ok(st, r), f"HTTP {st}")

        st, r = call("POST", "/comment/add", token=newtok,
                     body={"star": 5, "content": "自动化测试评价：味道不错", "orderId": order_id})
        check("POST /comment/add 评价", ok(st, r), f"HTTP {st} msg={r.get('msg') if isinstance(r,dict) else ''}")

        st, r = call("GET", f"/comment/selectAllByBid/{bid}")
        check("评价可公开查询", ok(st, r), f"HTTP {st}")

    # 清理
    if addr_id:
        call("DELETE", f"/address/delete/{addr_id}", token=admin)
    if new_uid:
        st, r = call("DELETE", f"/user/delete/{new_uid}", token=admin)
        check("清理测试用户", ok(st, r), f"HTTP {st}")

# ===================== 7. 导出与上传 =====================
section("7. 导出与文件上传")
st, body = call("GET", "/user/export", token=admin, raw=True)
check("GET /user/export 导出 Excel", st == 200 and isinstance(body, (bytes, bytearray)) and len(body) > 1000,
      f"HTTP {st} 字节={len(body) if isinstance(body,(bytes,bytearray)) else '?'}")

boundary = "----DSH" + uuid.uuid4().hex
payload = (f"--{boundary}\r\n"
           f'Content-Disposition: form-data; name="file"; filename="dsh_test.txt"\r\n'
           f"Content-Type: text/plain\r\n\r\n").encode() + b"DSH upload test\n" + f"\r\n--{boundary}--\r\n".encode()
req = urllib.request.Request(BASE + "/file/upload", data=payload, method="POST",
                             headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
try:
    with urllib.request.urlopen(req, timeout=25) as resp:
        st, r = resp.status, json.loads(resp.read())
except urllib.error.HTTPError as e:
    st, r = e.code, {}
except Exception as e:
    st, r = 0, {"_error": str(e)}
check("POST /file/upload 上传", ok(st, r), f"HTTP {st} data={str(r.get('data'))[:50] if isinstance(r,dict) else ''}")

# ===================== 8. 改密后旧 token 失效 =====================
section("8. 安全：改密后旧 token 失效（tokenVersion 机制）")
uname2 = f"pw{random.randint(100000, 999999)}"
st, r = call("POST", "/register", body={"username": uname2, "password": "oldpass123", "name": "改密测试"})
if ok(st, r):
    tk_old = login(uname2, "oldpass123")
    # 入参契约：{id, password}（password 为新密码）
    st, r = call("GET", "/user/selectByPage?pageNum=1&pageSize=200", token=admin)
    uid2 = None
    for it in ((r.get("data") or {}).get("records") or []):
        if it.get("username") == uname2:
            uid2 = it.get("id")
    st, r = call("PUT", "/user/updatePassword", token=tk_old,
                 body={"id": uid2, "password": "newpass456"})
    check("PUT /user/updatePassword 改密", ok(st, r), f"HTTP {st} msg={r.get('msg') if isinstance(r,dict) else ''}")

    st, r = call("GET", "/dashboard", token=tk_old)
    check("改密后旧 token 失效", not ok(st, r), f"HTTP {st} code={r.get('code') if isinstance(r,dict) else '?'}")

    tk_new = login(uname2, "newpass456")
    check("新密码可登录", len(tk_new) > 50, f"token长度={len(tk_new)}")

    # 清理（uid2 已在上面取得）
    if uid2:
        call("DELETE", f"/user/delete/{uid2}", token=admin)
else:
    SKIP.append("改密测试用户注册失败")

# ===================== 汇总 =====================
section("测试结果汇总")
print(f"  通过: {len(PASS)}")
print(f"  失败: {len(FAIL)}")
print(f"  跳过: {len(SKIP)}")
if FAIL:
    print("\n  失败明细：")
    for f in FAIL:
        print(f"    ✗ {f}")
if SKIP:
    print("\n  跳过项：")
    for s in SKIP:
        print(f"    - {s}")
print(f"\n  结论: {'全部通过 ✅' if not FAIL else '存在失败项 ❌'}")
sys.exit(1 if FAIL else 0)
