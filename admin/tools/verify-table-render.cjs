/**
 * 表格列渲染验证（针对「商家」显示 [object Object] 的缺陷）
 *
 * 做法：从 SFC 提取模板 → 编译成渲染函数 → 拿「真实后端数据」渲染 →
 * 对 el-table 的列插槽求值，输出单元格最终文本。
 *
 * 用法：node admin/tools/verify-table-render.js   （需后端运行在 :9090）
 */
const fs = require('fs')
const path = require('path')

const ADMIN = path.resolve(__dirname, '..')
const { parse } = require(path.join(ADMIN, 'node_modules/@vue/compiler-sfc'))
const { compile } = require(path.join(ADMIN, 'node_modules/@vue/compiler-dom'))
const { createSSRApp, h, toDisplayString } = require(path.join(ADMIN, 'node_modules/vue'))
const { renderToString } = require(path.join(ADMIN, 'node_modules/@vue/server-renderer'))

const BASE = 'http://localhost:9090'
let pass = 0, fail = 0
const failures = []

function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}${detail ? '   ' + detail : ''}`) }
  else { fail++; failures.push(name); console.log(`  [FAIL] ${name}   ${detail || ''}`) }
}
const section = (t) => console.log(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`)

/* ---------- 登录并取真实数据 ---------- */
async function api(pathname, token) {
  const res = await fetch(BASE + pathname, { headers: token ? { token } : {} })
  return res.json()
}
async function login(u, p) {
  const r = await fetch(BASE + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p })
  }).then((x) => x.json())
  return (r.data || {}).token || ''
}

/* ---------- 编译模板 ---------- */
/**
 * 编译 SFC 模板。
 * <script setup> 的绑定在编译产物中是「裸标识符引用」，因此这里为模板里出现的
 * 名字注入一个最小上下文（数据 + 空函数占位），使渲染函数可执行。
 * 我们只关心列的字段绑定是否正确，不校验业务方法的实现。
 */
function compileTemplate(file) {
  const src = fs.readFileSync(file, 'utf8')
  const { descriptor, errors } = parse(src)
  if (errors && errors.length) throw new Error('SFC 解析失败: ' + errors[0].message)
  // 使用 prefixIdentifiers: true —— 生成的代码不含 with 语句，
  // <script setup> 的绑定统一编译为 _ctx.xxx，可在模块/严格模式下安全执行。
  const out = compile(descriptor.template.content, { mode: 'function', prefixIdentifiers: true })
  if (out.errors && out.errors.length) throw new Error('模板编译失败: ' + out.errors[0].message)

  const vue = require(path.join(ADMIN, 'node_modules/vue'))
  const code = out.code

  // prefixIdentifiers 模式下，<script setup> 的绑定会编译成 _ctx.xxx（通过 with 作用域解析）
  const names = new Set()
  for (const m of code.matchAll(/_ctx\.([A-Za-z_$][\w$]*)/g)) names.add(m[1])
  // with(_ctx) 会做裸标识符查找，这里把上下文里出现的名字也记下来
  const bare = new Set()
  for (const m of code.matchAll(/(?:^|[^\w.$])([a-z_$][\w$]*)\s*(?=[,)\]}]|$)/gm)) {
    if (!['return', 'const', 'function', 'var', 'let', 'if', 'else', 'with'].includes(m[1])) bare.add(m[1])
  }

  // 编译产物是： const _Vue = Vue; return function render(_ctx,_cache){ with(_ctx){...} }
  // 内含 with，故不能运行在严格模式下（这正是之前 "Unexpected token 'with'" 的原因）。
  const factory = new Function('Vue', code)

  // 用「真实 Vue 运行时 + 少量覆盖」构造 _Vue：真实运行时可满足 createVNode /
  // toDisplayString 等全部辅助函数，只需记录 resolveComponent 解析出的组件名。
  const components = new Set()
  const stubVue = Object.create(vue)
  stubVue.resolveComponent = (name) => { components.add(name); return { __name: name } }
  stubVue.resolveDirective = (name) => ({ __name: name })
  stubVue.createCommentVNode = () => null
  stubVue.renderList = (arr, fn) => (arr || []).map(fn)
  stubVue.withDirectives = (v) => v

  const render = factory(stubVue)
  return { code, render, names, bare, components }
}

/* ---------- 在 vnode 树中收集指定组件（收集阶段不执行插槽内容） ---------- */
function collectByType(vnode, wanted, found = []) {
  if (!vnode || typeof vnode !== 'object') return found
  if (Array.isArray(vnode)) { vnode.forEach((v) => collectByType(v, wanted, found)); return found }
  const type = vnode.type
  const name = typeof type === 'string' ? type : (type && (type.__name || type.name)) || ''
  if (wanted.includes(name)) found.push(vnode)
  const kids = vnode.children
  if (Array.isArray(kids)) kids.forEach((k) => collectByType(k, wanted, found))
  else if (kids && typeof kids === 'object' && kids.default) {
    try {
      const d = kids.default({})
      if (Array.isArray(d)) d.forEach((k) => collectByType(k, wanted, found))
      else if (d) collectByType(d, wanted, found)
    } catch (e) { /* 插槽需要行数据才能在收集阶段展开，此处忽略 */ }
  }
  return found
}

/** 把 vnode / 字符串递归取出可读文本 */
function textOf(vnode) {
  if (vnode == null) return ''
  if (typeof vnode === 'string' || typeof vnode === 'number') return String(vnode)
  if (Array.isArray(vnode)) return vnode.map(textOf).join('')
  const kids = vnode.children
  if (kids == null) return ''
  // 文本 vnode：children 直接是字符串
  if (typeof kids === 'string' || typeof kids === 'number') return String(kids)
  if (Array.isArray(kids)) return kids.map(textOf).join('')
  if (typeof kids === 'object' && typeof kids.default === 'function') {
    try { return textOf(kids.default({})) } catch (e) { return '' }
  }
  return ''
}

/** 对某一列渲染一行数据，返回单元格文本 */
function cellText(columnVNode, row) {
  const props = columnVNode.props || {}
  const scoped = columnVNode.children && columnVNode.children.default
  if (scoped) {
    // _withCtx 包装后的插槽需要 Vue 渲染上下文才会执行；
    // 其原始函数挂在 .withCtx 属性上，这里直接调用以取得单元格内容。
    const raw = scoped.withCtx || scoped
    const out = raw({ row })
    return textOf(out)
  }
  // 无插槽：模拟 Element Plus 按 prop 取值（与 toDisplayString 行为一致）
  const prop = props.prop
  if (!prop) return ''
  const val = String(prop).split('.').reduce((o, k) => (o == null ? undefined : o[k]), row)
  if (val == null) return ''
  return String(val)
}

/**
 * 渲染整张表并取回每列的单元格文本。
 * 直接以「上下文代理 + 假数据」调用编译后的渲染函数，不挂载 SSR，
 * 这样可以按需把 row 传给列的作用域插槽，得到与 Element Plus 一致的单元格文本。
 */
function renderTable(render, row) {
  // with(_ctx) 会触发裸标识符查找，因此代理必须对所有名字返回可用值。
  // 数据相关键返回真实行数据，其余返回空函数占位。
  const ctx = new Proxy({}, {
    has: () => true,
    get: (t, k) => {
      if (k === Symbol.unscopables) return undefined
      if (k === 'filteredList' || k === 'list' || k === 'items') return [row]
      if (k === 'total') return 1
      if (k === 'loading') return false
      if (k === 'query') return {}
      if (k === 'selected') return []
      if (k === 'itemsVisible') return false
      if (typeof k === 'symbol') return undefined
      return () => {}
    }
  })

  const vnode = render(ctx, new Map())
  // 先找 el-table，再在其子树里找列定义（收集阶段不执行单元格插槽）
  const tables = collectByType(vnode, ['el-table', 'ElTable'])
  if (!tables.length) throw new Error('模板中未找到 el-table')
  const cols = collectByType(tables[0], ['el-table-column', 'ElTableColumn'])

  const result = {}
  for (const c of cols) {
    const label = (c.props && c.props.label) || ''
    if (!label) continue
    result[label] = {
      cell: cellText(c, row),
      prop: c.props && c.props.prop,
      hasSlot: !!(c.children && c.children.default)
    }
  }
  return result
}

/* ---------- 造一条临时订单（仅当订单为空时使用），返回订单 id ---------- */
async function seedOrder(adminToken) {
  const asUser = await login('test', '123456')
  if (!asUser) return null
  const post = (p, body, tk) => fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, tk ? { token: tk } : {}),
    body: JSON.stringify(body)
  }).then((r) => r.json())

  await post('/address/add', {
    address: '渲染验证临时地址', user: '验证', phone: '13900000000', userId: 2
  }, asUser)

  const list = (await api('/address/selectAll/2', asUser)).data || []
  const myAddr = list.find((a) => a.address === '渲染验证临时地址')
  if (!myAddr) return null

  await post('/cart/add', { pid: 1, bid: 1, num: 1 }, asUser)
  await post('/orders/addOrder', {
    bid: 1, user: '验证', addressId: myAddr.id, phone: '13900000000',
    comment: '渲染验证临时订单', payType: '微信'
  }, asUser)

  const orders = (await api('/orders/selectAll', adminToken)).data || []
  const mine = orders.find((o) => /渲染验证临时订单/.test(o.comment || ''))
  // 清理临时地址（订单保留到验证结束再删，因为验证需要它）
  await fetch(BASE + '/address/delete/' + myAddr.id, { method: 'DELETE', headers: { token: adminToken } })
  return mine ? mine.id : null
}

/* ---------- 主流程 ---------- */
async function main() {
  const token = await login('admin', 'admin123')
  if (!token) throw new Error('登录失败，请确认后端已启动')

  section('1. 后端返回的真实数据类型')
  let orders = (await api('/orders/selectAll', token)).data || []
  const comments = (await api('/comment/selectByPage?pageNum=1&pageSize=10', token)).data.records || []

  // 订单为空时自建一条临时数据（否则无法验证「商家」列）
  let tempOrderId = null
  if (!orders.length) {
    console.log('   （订单为空，创建临时订单用于验证）')
    tempOrderId = await seedOrder(token)
    orders = (await api('/orders/selectAll', token)).data || []
  }

  check('存在订单数据用于验证', orders.length > 0, '订单数=' + orders.length)
  check('存在评论数据用于验证', comments.length > 0, '评论数=' + comments.length)
  const orderRow = orders[0] || {}
  const commentRow = comments[0] || {}
  console.log('   订单.business 类型 =', typeof orderRow.business, '| .name =', orderRow.business && orderRow.business.name)
  console.log('   评论.user 类型 =', typeof commentRow.user, '| .name =', commentRow.user && commentRow.user.name)
  console.log('   评论.business 类型 =', typeof commentRow.business, '| .name =', commentRow.business && commentRow.business.name)

  section('2. Order.vue — 订单列表「商家」列')
  const orderRender = compileTemplate(path.join(ADMIN, 'src/views/order/Order.vue')).render
  const orderCells = renderTable(orderRender, orderRow)
  const bizCell = orderCells['商家'] || {}
  console.log('   商家单元格 =', JSON.stringify(bizCell.cell), '| 用插槽:', bizCell.hasSlot)
  check('「商家」列已使用作用域插槽（不再直接渲染对象）', bizCell.hasSlot === true)
  check('「商家」单元格显示商家名', bizCell.cell === (orderRow.business && orderRow.business.name),
    `"${bizCell.cell}"`)
  check('「商家」单元格不含 [object Object]', !/\[object Object\]/.test(bizCell.cell), `"${bizCell.cell}"`)
  check('「收货人」列正常显示（Orders.user 是字符串）',
    (orderCells['收货人'] || {}).cell === orderRow.user,
    `"${(orderCells['收货人'] || {}).cell}"`)

  section('3. Comment.vue — 评论列表「用户/商家/评论内容」列')
  const cmtRender = compileTemplate(path.join(ADMIN, 'src/views/order/Comment.vue')).render
  const cmtCells = renderTable(cmtRender, commentRow)
  for (const [label, expect] of [
    ['用户', (commentRow.user && (commentRow.user.name || commentRow.user.username)) || '—'],
    ['商家', commentRow.business ? commentRow.business.name : '—'],
    ['评论内容', commentRow.content]
  ]) {
    const c = cmtCells[label] || {}
    console.log(`   ${label}单元格 =`, JSON.stringify(c.cell))
    check(`「${label}」列显示正确`, c.cell === expect, `"${c.cell}" 期望 "${expect}"`)
    check(`「${label}」列不含 [object Object]`, !/\[object Object\]/.test(c.cell || ''))
  }

  section('4. 回归：确认其余页面未受影响（字段本就是字符串）')
  for (const [file, label, pathKey] of [
    ['src/views/business/Product.vue', '商家', '/product/selectAll'],
    ['src/views/system/Logs.vue', '操作人', '/logs/selectByPage?pageNum=1&pageSize=10'],
    ['src/views/user/Address.vue', '收货人', '/address/selectByPage?pageNum=1&pageSize=10']
  ]) {
    const resp = await api(pathKey, token)
    const rows = (resp.data && resp.data.records) || resp.data || []
    if (!rows.length) { console.log(`   ${path.basename(file)} 无数据，跳过`); continue }
    const render = compileTemplate(path.join(ADMIN, file)).render
    const cells = renderTable(render, rows[0])
    const cell = (cells[label] || {}).cell
    check(`${path.basename(file)} 的「${label}」列正常`, typeof cell === 'string' && !/\[object Object\]/.test(cell),
      `"${cell}"`)
  }

  // 清理临时订单
  if (tempOrderId) {
    await fetch(BASE + '/orders/delete/' + tempOrderId, { method: 'DELETE', headers: { token } })
    console.log(`  已清理临时订单 id=${tempOrderId}`)
  }

  section('验证结果')
  console.log(`  通过: ${pass}`)
  console.log(`  失败: ${fail}`)
  if (failures.length) { console.log('\n  失败明细：'); failures.forEach((f) => console.log('    ✗ ' + f)) }
  console.log(`\n  结论: ${fail === 0 ? '表格渲染字段绑定全部正确 ✅' : '存在失败项 ❌'}`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('验证脚本异常:', e); process.exit(2) })
