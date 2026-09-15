const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

const TABS = ['全部', '进行中', '待评价', '退款']

Page({
  data: {
    tabs: TABS,
    active: '全部',
    orders: [],
    loading: true,
    logged: false
  },

  onShow() {
    this.setData({ logged: auth.isLogin() })
    if (!auth.isLogin()) {
      this.setData({ orders: [], loading: false })
      return
    }
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.active) return
    this.setData({ active: tab })
    this.load()
  },

  load() {
    if (!auth.isLogin()) return Promise.resolve()
    this.setData({ loading: true })
    return api.order.listByStatus(auth.uid(), this.data.active)
      .then((list) => {
        const orders = (list || []).map((o) => {
          const status = o.status || ''
          return {
            id: o.id,
            bid: util.num(o.bid),
            orderNo: o.orderNo || '',
            status,
            statusText: util.statusText(status),
            statusColor: util.statusColor(status),
            name: o.name || '',
            coverUrl: api.file.fullUrl(o.cover),
            time: util.friendlyTime(o.time),
            payTime: util.friendlyTime(o.payTime),
            payType: o.payType || '',
            amountText: util.money(o.amount),
            actualText: util.money(o.actual),
            commentStatus: util.num(o.commentStatus),
            deliverymanName: o.deliverymanName || '',
            // 操作按钮按状态生成
            canPay: status === '待支付',
            canCancel: status === '待支付' || status === '待发货',
            canReceive: status === '待收货' || status === '已发货' || status === '正在配送',
            canComment: status === '已完成' && util.num(o.commentStatus) === 0,
            canRebuy: status === '已完成',
            canRefund: status === '待发货'
          }
        })
        this.setData({ orders, loading: false })
      })
      .catch(() => this.setData({ loading: false }))
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/ordersItem/ordersItem?id=' + e.currentTarget.dataset.id })
  },

  /** 去支付：状态置为「待发货」，后端自动记录 payTime */
  pay(e) {
    const id = e.currentTarget.dataset.id
    util.confirm('确认支付该订单？', '去支付').then((yes) => {
      if (!yes) return
      api.order.update({ id, status: '待发货' })
        .then(() => { util.toast('支付成功', 'success'); this.load() })
        .catch(() => {})
    })
  },

  /** 确认收货 */
  receive(e) {
    const id = e.currentTarget.dataset.id
    util.confirm('确认已收到餐品？').then((yes) => {
      if (!yes) return
      api.order.update({ id, status: '已完成' })
        .then(() => { util.toast('已确认收货', 'success'); this.load() })
        .catch(() => {})
    })
  },

  /** 取消订单 */
  cancel(e) {
    const id = e.currentTarget.dataset.id
    util.confirm('确定取消该订单？').then((yes) => {
      if (!yes) return
      api.order.update({ id, status: '已取消' })
        .then(() => { util.toast('订单已取消'); this.load() })
        .catch(() => {})
    })
  },

  /** 申请退款（状态流转为已退款） */
  refund(e) {
    const id = e.currentTarget.dataset.id
    util.confirm('确定申请退款？').then((yes) => {
      if (!yes) return
      api.order.update({ id, status: '已退款' })
        .then(() => { util.toast('已申请退款'); this.load() })
        .catch(() => {})
    })
  },

  goComment(e) {
    wx.navigateTo({ url: '/pages/comment/comment?id=' + e.currentTarget.dataset.id })
  },

  /**
   * 再来一单：把该订单商品重新加入购物车。
   * 注意：后端订单明细只存商品快照（productName/price/num），不含 pid，
   * 因此需要按商品名在「该商家的商品列表」中反查 pid。
   */
  rebuy(e) {
    const order = this.data.orders.find((o) => String(o.id) === String(e.currentTarget.dataset.id))
    if (!order) return
    const bid = util.num(order.bid)
    if (!bid) return util.toast('订单缺少商家信息')

    wx.showLoading({ title: '处理中…', mask: true })
    Promise.all([
      api.order.items(order.id),
      api.catalog.allProducts()
    ]).then(([items, products]) => {
      const list = items || []
      if (!list.length) throw new Error('该订单没有商品明细')

      const pool = (products || []).filter((p) => util.num(p.bid) === bid)
      const matched = []
      let missed = 0
      list.forEach((it) => {
        const name = String(it.productName || '').trim()
        const hit = pool.find((p) => String(p.name || '').trim() === name)
        if (hit) matched.push({ pid: hit.id, bid, num: util.num(it.num) || 1 })
        else missed++
      })

      if (!matched.length) throw new Error('商品已下架，无法再来一单')

      // 串行加购，避免并发写入购物车造成重复行
      let chain = Promise.resolve()
      matched.forEach((m) => {
        chain = chain.then(() => api.cart.add(m))
      })
      return chain.then(() => {
        wx.hideLoading()
        const tip = missed ? `已加入购物车（${missed} 件商品已下架）` : '已加入购物车'
        util.toast(tip, 'success')
        setTimeout(() => wx.navigateTo({ url: '/pages/confirm/confirm?bid=' + bid }), 800)
      })
    }).catch((err) => {
      wx.hideLoading()
      util.toast(err.message || '操作失败')
    })
  },

  contact() {
    util.toast('在线联系功能待接入客服系统')
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
