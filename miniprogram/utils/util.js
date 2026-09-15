/**
 * 格式化与通用工具
 */

/** 金额：保留两位小数，去掉多余的 .00 */
function money(v) {
  const n = Number(v)
  if (!isFinite(n)) return '0.00'
  return n.toFixed(2)
}

/** 价格展示：整数不显示小数位，如 7 / 7.50 */
function priceText(v) {
  const n = Number(v)
  if (!isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/** 数字安全转换 */
function num(v, def) {
  const n = Number(v)
  return isFinite(n) ? n : (def === undefined ? 0 : def)
}

/** 11 位手机号校验 */
function isPhone(v) {
  return /^1[3-9]\d{9}$/.test(String(v || '').trim())
}

/** 18 位身份证校验（含校验位） */
function isIdCard(v) {
  const s = String(v || '').trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(s)) return false
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const check = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(s[i]) * w[i]
  return check[sum % 11] === s[17]
}

/** 订单状态 → 展示文案与颜色 */
const STATUS_MAP = {
  '待支付': { text: '待支付', color: '#ff5a1f' },
  '待发货': { text: '待发货', color: '#ff8a4c' },
  '待收货': { text: '待收货', color: '#2f80ed' },
  '已发货': { text: '已发货', color: '#2f80ed' },
  '正在配送': { text: '正在配送', color: '#2f80ed' },
  '已出餐': { text: '已出餐', color: '#2f80ed' },
  '已完成': { text: '已完成', color: '#17a34a' },
  '已取消': { text: '已取消', color: '#8c94a3' },
  '已退款': { text: '已退款', color: '#8c94a3' }
}

function statusText(s) {
  return (STATUS_MAP[s] || {}).text || s || '未知'
}

function statusColor(s) {
  return (STATUS_MAP[s] || {}).color || '#8c94a3'
}

/** 时间字符串 → 友好展示 */
function friendlyTime(t) {
  if (!t) return ''
  const s = String(t).replace('T', ' ').replace(/\.\d+Z?$/, '')
  return s.slice(0, 16)
}

/** 富文本 → 纯文本摘要（公告/新闻用） */
function plainText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/** 微信小程序富文本可用的 HTML 清洗：去掉 script/style，图片自适应 */
function richHtml(html) {
  let s = String(html || '')
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<img([^>]*?)>/gi, (m, attrs) => {
    if (/style=/i.test(attrs)) return '<img' + attrs + '>'
    return '<img' + attrs + ' style="max-width:100%;height:auto;">'
  })
  return s
}

/** 轻提示 */
function toast(title, icon) {
  wx.showToast({ title: title, icon: icon || 'none' })
}

/** 确认弹窗 → Promise<boolean> */
function confirm(content, title) {
  return new Promise((resolve) => {
    wx.showModal({
      title: title || '提示',
      content,
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false)
    })
  })
}

module.exports = {
  money, priceText, num, isPhone, isIdCard,
  statusText, statusColor, friendlyTime, plainText, richHtml,
  toast, confirm, STATUS_MAP
}
