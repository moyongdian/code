/**
 * 小程序联调测试台
 *
 * 微信开发者工具无法在本环境运行，因此这里桩掉 wx.* API，
 * 直接加载真实的页面 JS 与 utils/api 模块，打到运行中的后端（http://localhost:9090），
 * 验证「数据契约 + 页面逻辑」是否真的跑得通。
 *
 * 运行：node /home/ubuntu/code/miniprogram/tools/verify.js
 */
const path = require('path')
const Module = require('module')

const MP_ROOT = path.resolve(__dirname, '..')
const BASE = 'http://localhost:9090'

/* ============================ 桩：存储 ============================ */
const storage = {}
let currentApp = null

/* ============================ 桩：wx ============================ */
const logs = []
const toasts = []
const navStack = []
let requests = 0
let requestFails = 0

function stubWx() {
  return {
    request(opts) {
      requests++
      const method = (opts.method || 'GET').toUpperCase()
      const url = opts.url
      const u = new URL(url)
      if (opts.data && Object.keys(opts.data).length && method === 'GET') {
        Object.keys(opts.data).forEach((k) => {
          if (opts.data[k] !== undefined && opts.data[k] !== null) u.searchParams.set(k, opts.data[k])
        })
      }
      const body = (method === 'GET' || method === 'HEAD') ? null : JSON.stringify(opts.data || {})
      const headers = Object.assign({}, opts.header || {})
      fetch(u.toString(), {
        method,
        headers,
        body
      }).then(async (res) => {
        const text = await res.text()
        let data
        try { data = JSON.parse(text) } catch (e) { data = text }
        if (res.status === 401 || (data && typeof data === 'object' && data.code === 401)) {
          logs.push('UNAUTH ' + method + ' ' + u.pathname + ' :: ' + (data && data.msg))
          console.log('    ! 401 ' + method + ' ' + u.pathname + ' :: ' + (data && data.msg))
        }
        opts.success && opts.success({ statusCode: res.status, data })
        opts.complete && opts.complete()
      }).catch((err) => {
        requestFails++
        logs.push('REQUEST FAIL ' + method + ' ' + url + ' :: ' + err.message)
        opts.fail && opts.fail({ errMsg: String(err.message || err) })
        opts.complete && opts.complete()
      })
    },
    getStorageSync: (k) => (k in storage ? storage[k] : ''),
    setStorageSync: (k, v) => { storage[k] = v },
    removeStorageSync: (k) => { delete storage[k] },
    showToast: (o) => { toasts.push(o.title); logs.push('TOAST ' + o.title) },
    hideToast: () => {},
    showLoading: (o) => { logs.push('LOADING ' + (o && o.title)) },
    hideLoading: () => {},
    showModal: (o) => {
      logs.push('MODAL ' + o.title + ' :: ' + (o.content || '').slice(0, 60))
      // 自动选择「确定」，模拟用户确认
      setTimeout(() => o.success && o.success({ confirm: true, cancel: false }), 0)
    },
    navigateTo: (o) => { navStack.push(o.url); logs.push('navigateTo ' + o.url); o.success && o.success() },
    navigateBack: () => { navStack.pop(); logs.push('navigateBack') },
    redirectTo: (o) => { logs.push('redirectTo ' + o.url); o.success && o.success() },
    reLaunch: (o) => { logs.push('reLaunch ' + o.url); o.success && o.success() },
    switchTab: (o) => { logs.push('switchTab ' + o.url); o.success && o.success() },
    setNavigationBarTitle: (o) => { logs.push('title ' + o.title) },
    stopPullDownRefresh: () => {},
    chooseMedia: (o) => { o.fail && o.fail({ errMsg: 'stub: no media' }) },
    uploadFile: (o) => { o.fail && o.fail({ errMsg: 'stub: no upload' }) },
    makePhoneCall: (o) => { logs.push('call ' + o.phoneNumber); o.fail && o.fail({}) },
    setClipboardData: (o) => { logs.push('clipboard ' + o.data); o.success && o.success() },
    previewImage: (o) => { logs.push('previewImage') },
    showToast_: null
  }
}

/* ============================ 桩：App / Page / getApp ============================ */
function bootGlobals() {
  global.wx = stubWx()
  global.App = (cfg) => {
    currentApp = cfg
    global.getApp = () => ({
      globalData: cfg.globalData,
      setUser(u) {
        cfg.globalData.userInfo = u || null
        if (u) storage['honey-user'] = u
        else { delete storage['honey-user']; delete storage['honey-token'] }
      }
    })
  }
  global.Page = (cfg) => { global.__lastPage = cfg }
  global.getCurrentPages = () => [{}]
}

/* ============================ 加载模块（Node 版 require） ============================ */
const loaded = {}
function loadPage(rel) {
  const abs = path.join(MP_ROOT, rel)
  delete require.cache[require.resolve(abs)]
  global.__lastPage = null
  require(abs)
  const cfg = global.__lastPage
  if (!cfg) throw new Error('Page() 未注册: ' + rel)
  return makeInstance(cfg)
}

/** 构造页面实例：支持 setData 的点路径 */
function makeInstance(cfg) {
  const inst = Object.assign({}, cfg)
  inst.data = JSON.parse(JSON.stringify(cfg.data || {}))
  inst.setData = function (patch, cb) {
    Object.keys(patch || {}).forEach((k) => {
      if (k.indexOf('.') >= 0) {
        const parts = k.split('.')
        let cur = inst.data
        for (let i = 0; i < parts.length - 1; i++) {
          if (cur[parts[i]] === undefined || cur[parts[i]] === null) cur[parts[i]] = {}
          cur = cur[parts[i]]
        }
        cur[parts[parts.length - 1]] = patch[k]
      } else {
        inst.data[k] = patch[k]
      }
    })
    if (cb) cb()
  }
  return inst
}

/* ============================ 断言 ============================ */
let pass = 0, fail = 0
const failures = []
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}${detail ? '   ' + detail : ''}`) }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log(`  [FAIL] ${name}   ${detail || ''}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 轮询等待条件成立，避免用固定 sleep 造成偶发失败 */
async function waitFor(fn, timeout = 8000, step = 100) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    try { if (fn()) return true } catch (e) {}
    await sleep(step)
  }
  return false
}
function section(t) { console.log(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`) }

/* ============================ 主流程 ============================ */
async function main() {
  bootGlobals()
  require(path.join(MP_ROOT, 'app.js'))   // 注册 App，拿到 getApp
  const api = require(path.join(MP_ROOT, 'api/index.js'))
  const auth = require(path.join(MP_ROOT, 'utils/auth.js'))

  // ---------- 1. 登录 ----------
  section('1. 登录（api.loginAndStore）')
  let user
  try {
    user = await api.loginAndStore('test', '123456')
  } catch (e) { check('登录普通用户 test', false, e.message) }
  check('登录普通用户 test', !!(user && user.token), user ? `uid=${user.id} role=${user.role}` : '')
  check('登录态已落地本地缓存', !!auth.getToken(), 'token 长度=' + (auth.getToken() || '').length)

  // 错误密码必须失败
  let wrongOk = false
  try { await api.loginAndStore('test', 'wrong-password'); wrongOk = true } catch (e) {}
  check('错误密码登录被拒绝', !wrongOk)

  // ---------- 2. 首页 ----------
  section('2. 首页 pages/index/index')
  const idx = loadPage('pages/index/index.js')
  idx.onLoad()
  await sleep(1500)
  check('商家列表加载', (idx.data.businesses || []).length >= 1, '商家数=' + (idx.data.businesses || []).length)
  check('公告加载', (idx.data.noticeList || []).length >= 1, '公告数=' + (idx.data.noticeList || []).length)
  check('公告文本已去 HTML 标签', !/</.test(idx.data.noticeText || ''), JSON.stringify((idx.data.noticeText || '').slice(0, 30)))
  check('分类入口聚合', (idx.data.categories || []).length >= 1, '分类=' + (idx.data.categories || []).map(c => c.name).join('/'))
  check('loading 已结束', idx.data.loading === false)
  const biz = (idx.data.businesses || [])[0] || {}
  check('商家字段映射（scoreText/openText/logoUrl）',
    !!biz.scoreText && !!biz.openText && biz.logoUrl !== undefined,
    `name=${biz.name} score=${biz.scoreText} open=${biz.openText}`)

  // ---------- 3. 商家详情 ----------
  section('3. 商家详情 pages/detail/detail')
  const det = loadPage('pages/detail/detail.js')
  det.onLoad({ id: String(biz.id) })
  await sleep(1800)
  check('商家信息加载', !!det.data.business, det.data.business ? det.data.business.name : '')
  check('分类列表加载', (det.data.categories || []).length >= 1, '分类数=' + (det.data.categories || []).length)
  check('首个分类商品自动加载', (det.data.products || []).length >= 1, '商品数=' + (det.data.products || []).length)
  const p0 = (det.data.products || [])[0] || {}
  check('商品价格字段（原价/到手价/折扣标记）',
    p0.realPriceText !== undefined && p0.priceText !== undefined && p0.hasDiscount !== undefined,
    `name=${p0.name} 原价=${p0.priceText} 到手=${p0.realPriceText} 折扣=${p0.hasDiscount}`)
  check('7 折关系成立', Number(p0.realPriceText) <= Number(p0.priceText),
    `${p0.realPriceText} <= ${p0.priceText}`)

  // 加购
  const totalBefore = det.data.cartCount
  det.addToCart({ currentTarget: { dataset: { item: p0 } } })
  await sleep(1200)
  check('加购后购物车数量 +1', det.data.cartCount === totalBefore + 1,
    `${totalBefore} → ${det.data.cartCount}`)
  check('购物车金额已计算', Number(det.data.cartTotal) > 0, '合计=' + det.data.cartTotal)
  const added = (det.data.cartList || []).find((c) => String(c.pid) === String(p0.id))
  check('购物车含该商品且带 product 信息', !!added && !!added.name, added ? added.name : '未找到')

  // 加减数量
  if (added) {
    det.changeNum({ currentTarget: { dataset: { id: added.id, pid: added.pid, delta: 1 } } })
    await sleep(1200)
    const after = (det.data.cartList || []).find((c) => String(c.pid) === String(p0.id))
    check('购物车数量增加生效', !!after && after.num === added.num + 1, after ? `${added.num} → ${after.num}` : '')
    det.changeNum({ currentTarget: { dataset: { id: after.id, pid: after.pid, delta: -1 } } })
    await sleep(1200)
    const back = (det.data.cartList || []).find((c) => String(c.pid) === String(p0.id))
    check('购物车数量减少生效', !!back && back.num === added.num, back ? `→ ${back.num}` : '')
  }

  // 收藏
  const collectBefore = det.data.isCollect
  det.toggleCollect()
  await sleep(1200)
  check('收藏切换生效', det.data.isCollect === !collectBefore, `${collectBefore} → ${det.data.isCollect}`)
  det.toggleCollect()
  await sleep(1200)
  check('取消收藏生效', det.data.isCollect === collectBefore, `→ ${det.data.isCollect}`)

  // 评价列表
  check('评价列表字段映射', Array.isArray(det.data.comments), '条数=' + (det.data.comments || []).length)

  // 切换分类
  if ((det.data.categories || []).length > 1) {
    const cid = det.data.categories[1].id
    det.switchCategory({ currentTarget: { dataset: { cid } } })
    await sleep(1500)
    check('切换分类加载商品', det.data.activeCid === cid, 'activeCid=' + det.data.activeCid)
  }

  // ---------- 4. 购物车页（跨商家聚合） ----------
  section('4. 购物车 pages/cart/cart')
  const cart = loadPage('pages/cart/cart.js')
  cart.onShow()
  await sleep(1500)
  check('购物车按商家分组', (cart.data.groups || []).length >= 1, '分组数=' + (cart.data.groups || []).length)
  const g0 = (cart.data.groups || [])[0] || {}
  check('分组含商家名与商品', !!g0.name && (g0.items || []).length >= 1,
    `${g0.name} / ${(g0.items || []).length} 件`)
  check('购物车总计已计算', Number(cart.data.totalAmount) > 0,
    '合计=' + cart.data.totalAmount + ' 件数=' + cart.data.totalCount)

  // ---------- 5. 地址 ----------
  section('5. 地址管理 pages/addressEdit + pages/address')
  const addrEdit = loadPage('pages/addressEdit/addressEdit.js')
  addrEdit.onLoad({})
  addrEdit.onInput({ currentTarget: { dataset: { field: 'user' } }, detail: { value: '联调测试' } })
  addrEdit.onInput({ currentTarget: { dataset: { field: 'phone' } }, detail: { value: '13900008888' } })
  addrEdit.onInput({ currentTarget: { dataset: { field: 'address' } }, detail: { value: '联调测试地址 A 栋 101' } })
  addrEdit.submit()
  await sleep(1500)
  check('新增地址成功', toasts.some((t) => /已添加/.test(t)), toasts.slice(-2).join('|'))

  const addr = loadPage('pages/address/address.js')
  addr.onLoad({ select: '1' })
  addr.onShow()
  await waitFor(() => addr.data.loading === false, 8000)
  const myAddr = (addr.data.list || []).find((a) => a.address === '联调测试地址 A 栋 101')
  check('地址列表含新增地址', !!myAddr, '条数=' + (addr.data.list || []).length)
  check('选择模式回传地址到全局', (() => {
    if (!myAddr) return false
    addr.choose({ currentTarget: { dataset: { item: myAddr } } })
    const g = getApp().globalData.pickedAddress
    return g && g.id === myAddr.id
  })(), myAddr ? 'id=' + myAddr.id : '')
  const addrId = myAddr ? myAddr.id : null

  // ---------- 6. 确认订单 ----------
  section('6. 确认订单 pages/confirm/confirm')
  const conf = loadPage('pages/confirm/confirm.js')
  conf.onLoad({ bid: String(biz.id) })
  await sleep(1800)
  check('确认页商品清单加载', (conf.data.items || []).length >= 1, '条目=' + (conf.data.items || []).length)
  check('地址已自动选中', !!conf.data.address, conf.data.address ? conf.data.address.address : '')
  check('原价/优惠/实付已计算',
    Number(conf.data.amount) > 0 && Number(conf.data.actual) > 0,
    `原价=${conf.data.amount} 优惠=${conf.data.discount} 实付=${conf.data.actual}`)
  const expectActual = Math.round((Number(conf.data.amount) - Number(conf.data.discount)) * 100) / 100
  check('实付 = 原价 - 优惠', Math.abs(expectActual - Number(conf.data.actual)) < 0.011,
    `${conf.data.amount} - ${conf.data.discount} = ${conf.data.actual}`)

  // ---------- 7. 下单 ----------
  section('7. 下单 pages/confirm.submit → 后端事务')
  const orderCountBefore = (await api.order.listByStatus(auth.uid(), '全部').catch(() => [])).length
  conf.submit()
  await sleep(2500)
  const orders = await api.order.listByStatus(auth.uid(), '全部').catch(() => [])
  check('下单后订单数 +1', orders.length === orderCountBefore + 1, `${orderCountBefore} → ${orders.length}`)
  const newOrder = orders[0] || {}
  check('新订单为待支付状态', newOrder.status === '待支付', 'status=' + newOrder.status)
  check('订单号已生成（雪花号）', !!newOrder.orderNo, 'orderNo=' + newOrder.orderNo)
  check('订单实付金额正确', Number(newOrder.actual) > 0,
    `amount=${newOrder.amount} actual=${newOrder.actual}`)
  const cartAfter = await api.cart.listByBusiness(biz.id, auth.uid()).catch(() => [])
  check('下单后购物车已清空', cartAfter.length === 0, '剩余=' + cartAfter.length)

  // ---------- 8. 订单列表与详情 ----------
  section('8. 订单列表/详情/状态流转 pages/orders + ordersItem')
  const ordersPage = loadPage('pages/orders/orders.js')
  ordersPage.onShow()
  await sleep(1500)
  check('订单列表加载', (ordersPage.data.orders || []).length >= 1, '条数=' + (ordersPage.data.orders || []).length)
  const oCard = (ordersPage.data.orders || []).find((o) => String(o.id) === String(newOrder.id))
  check('订单卡片状态/按钮映射正确',
    !!oCard && oCard.canPay === true && oCard.canCancel === true,
    oCard ? `status=${oCard.status} canPay=${oCard.canPay} canReceive=${oCard.canReceive}` : '未找到')

  const detail = loadPage('pages/ordersItem/ordersItem.js')
  detail.onLoad({ id: String(newOrder.id) })
  await sleep(1500)
  check('订单详情加载', !!detail.data.order, detail.data.order ? detail.data.order.orderNo : '')
  check('订单明细加载', (detail.data.items || []).length >= 1, '明细=' + (detail.data.items || []).length)
  const it0 = (detail.data.items || [])[0] || {}
  check('明细字段（名称/数量/实付单价）',
    !!it0.name && it0.num > 0 && Number(it0.realPriceText) > 0,
    `${it0.name} ×${it0.num} @${it0.realPriceText}`)

  // 支付：待支付 → 待发货，且自动记录 payTime
  detail.pay()
  await sleep(1800)
  const paid = await api.order.detail(newOrder.id)
  check('支付后状态=待发货', paid.status === '待发货', 'status=' + paid.status)
  check('支付时间已自动记录', !!paid.payTime, 'payTime=' + paid.payTime)

  // 确认收货：待发货 → 已完成
  await api.order.update({ id: newOrder.id, status: '待收货' })
  await sleep(300)
  const recvPage = loadPage('pages/ordersItem/ordersItem.js')
  recvPage.onLoad({ id: String(newOrder.id) })
  await sleep(1200)
  recvPage.receive()
  await sleep(1800)
  const done = await api.order.detail(newOrder.id)
  check('确认收货后状态=已完成', done.status === '已完成', 'status=' + done.status)

  // ---------- 9. 评价 ----------
  section('9. 发表评价 pages/comment/comment')
  const cmt = loadPage('pages/comment/comment.js')
  cmt.onLoad({ id: String(newOrder.id) })
  await sleep(1200)
  check('评价页加载订单', !!cmt.data.order, cmt.data.order ? cmt.data.order.orderNo : '')
  cmt.setStar({ currentTarget: { dataset: { star: 4 } } })
  check('星级选择生效', cmt.data.star === 4, 'star=' + cmt.data.star)
  cmt.onContentInput({ detail: { value: '联调测试评价：出餐快，味道好' } })
  cmt.submit()
  await sleep(2000)
  const commented = await api.order.detail(newOrder.id)
  check('评价后订单 commentStatus=1', Number(commented.commentStatus) === 1, 'commentStatus=' + commented.commentStatus)
  const myComments = await api.comment.listByUser(auth.uid()).catch(() => [])
  check('我的评价列表含新评价', (myComments || []).some((c) => /联调测试评价/.test(c.content || '')),
    '条数=' + (myComments || []).length)

  // 待评价标签不再包含该订单
  const toComment = await api.order.listByStatus(auth.uid(), '待评价').catch(() => [])
  check('「待评价」不再包含已评价订单', !(toComment || []).some((o) => String(o.id) === String(newOrder.id)),
    '待评价条数=' + (toComment || []).length)

  // ---------- 10. 收藏列表 / 我的评价 ----------
  section('10. 收藏与我的评价页面')
  await api.collect.add({ bid: biz.id, businessName: biz.name })
  await sleep(300)
  const col = loadPage('pages/collect/collect.js')
  col.onShow()
  await sleep(1400)
  check('收藏列表含刚收藏商家', (col.data.list || []).some((x) => String(x.bid) === String(biz.id)),
    '条数=' + (col.data.list || []).length)
  check('收藏项含商家对象（business 预加载）',
    (col.data.list || []).every((x) => !!x.name), (col.data.list || []).map(x => x.name).join('/'))

  const myc = loadPage('pages/myComment/myComment.js')
  myc.onShow()
  await sleep(1400)
  check('我的评价页加载', (myc.data.list || []).length >= 1, '条数=' + (myc.data.list || []).length)
  const mc0 = (myc.data.list || [])[0] || {}
  check('评价项含商家名与星级', !!mc0.businessName && !!mc0.starText,
    `${mc0.businessName} ${mc0.starText}`)

  // ---------- 11. 个人中心 / 个人信息 ----------
  section('11. 个人中心与个人信息 pages/me + person')
  const me = loadPage('pages/me/me.js')
  me.onShow()
  await sleep(2000)
  check('个人中心读取登录态', me.data.logged === true, 'user=' + (me.data.user || {}).username)
  check('订单角标统计完成', typeof me.data.orderCounts.pending === 'number',
    JSON.stringify(me.data.orderCounts))

  const person = loadPage('pages/person/person.js')
  person.onLoad()
  await sleep(1200)
  check('个人信息回填', person.data.form.username === 'test',
    `username=${person.data.form.username} name=${person.data.form.name} sex=${person.data.form.sex}`)

  // 回归防线：进入个人信息页后 token 必须仍然有效
  // （此前 /user/selectById 返回的空 token 会覆盖本地 token，导致提交 401）
  check('★回归：个人中心未覆盖本地 token', (auth.getToken() || '').length > 50,
    'token长度=' + (auth.getToken() || '').length + ' uid=' + auth.uid())

  // 关键回归：更新资料不得破坏登录（此前会清空密码）
  person.onInput({ currentTarget: { dataset: { field: 'name' } }, detail: { value: '联调改名' } })
  person.submit()
  await sleep(2000)
  check('保存资料成功', toasts.some((t) => /已保存/.test(t)), toasts.slice(-2).join('|'))
  let reloginOk = false
  try { await api.loginAndStore('test', '123456'); reloginOk = true } catch (e) {}
  check('★回归：改资料后原密码仍可登录', reloginOk)
  const meAfter = await api.auth.userById(auth.uid())
  check('★回归：姓名已真正更新', meAfter.name === '联调改名', 'name=' + meAfter.name)
  // 还原姓名
  await api.auth.updateUser({ id: auth.uid(), username: 'test', name: '测试用户', phone: meAfter.phone || '', email: meAfter.email || '', sex: meAfter.sex, avatar: meAfter.avatar || '' })
  await sleep(300)

  // ---------- 12. 未登录拦截 ----------
  section('12. 未登录时的页面行为')
  const app = getApp()
  app.setUser(null)
  const ordersGuest = loadPage('pages/orders/orders.js')
  ordersGuest.onShow()
  await sleep(600)
  check('未登录订单页显示登录引导', ordersGuest.data.logged === false)
  const cartGuest = loadPage('pages/cart/cart.js')
  cartGuest.onShow()
  await sleep(600)
  check('未登录购物车页不报错且为空', (cartGuest.data.groups || []).length === 0)

  // ---------- 清理 ----------
  section('13. 清理联调数据')
  try { await api.loginAndStore('test', '123456') } catch (e) {}
  if (addrId) { await api.address.remove(addrId).catch(() => {}); console.log('  已删除测试地址 id=' + addrId) }
  await api.order.remove(newOrder.id).catch(() => {})
  console.log('  已删除测试订单 id=' + newOrder.id)
  // 注意：/collect/selectByUid 返回的是 Business 列表，商家 id 在 c.id 上
  const cols = await api.collect.list(auth.uid()).catch(() => [])
  const colRec = (cols || []).find((c) => String(c.id) === String(biz.id))
  if (colRec) {
    await api.collect.update({ bid: biz.id }).catch(() => {})
    const left = await api.collect.list(auth.uid()).catch(() => [])
    const stillThere = (left || []).some((c) => String(c.id) === String(biz.id))
    console.log('  已取消测试收藏' + (stillThere ? '（⚠️ 仍残留）' : '（已验证清除）'))
  }

  // ---------- 汇总 ----------
  section('联调验证结果')
  console.log(`  HTTP 请求数: ${requests}   失败: ${requestFails}`)
  console.log(`  通过: ${pass}`)
  console.log(`  失败: ${fail}`)
  if (failures.length) {
    console.log('\n  失败明细：')
    failures.forEach((f) => console.log('    ✗ ' + f))
  }
  console.log(`\n  结论: ${fail === 0 ? '小程序 ↔ 后端 联调全部通过 ✅' : '存在失败项 ❌'}`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('\n测试台异常:', e)
  process.exit(2)
})
