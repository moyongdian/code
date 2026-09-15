const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    groups: [],
    loading: true,
    totalCount: 0,
    totalAmount: '0.00'
  },

  onShow() {
    if (!auth.isLogin()) {
      this.setData({ loading: false, groups: [] })
      return
    }
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    this.setData({ loading: true })
    return api.cart.listAll().then((list) => {
      const map = {}
      const order = []
      ;(list || []).forEach((c) => {
        const p = c.product || {}
        const b = c.business || {}
        if (!map[c.bid]) {
          map[c.bid] = { bid: c.bid, name: b.name || ('商家 #' + c.bid), items: [], amount: 0, count: 0 }
          order.push(c.bid)
        }
        const num = util.num(c.num)
        const line = util.num(p.realPrice) * num
        map[c.bid].items.push({
          id: c.id,
          pid: c.pid,
          num,
          name: p.name || '',
          imgUrl: api.file.fullUrl(p.picture),
          realPriceText: util.priceText(p.realPrice),
          priceText: util.priceText(p.price),
          hasDiscount: util.num(p.realPrice) < util.num(p.price),
          lineTotal: util.money(line)
        })
        map[c.bid].amount += line
        map[c.bid].count += num
      })

      let totalCount = 0
      let totalAmount = 0
      const groups = order.map((bid) => {
        const g = map[bid]
        totalCount += g.count
        totalAmount += g.amount
        g.amountText = util.money(g.amount)
        return g
      })

      this.setData({
        groups,
        loading: false,
        totalCount,
        totalAmount: util.money(totalAmount)
      })
    }).catch(() => this.setData({ loading: false }))
  },

  changeNum(e) {
    const { id, pid, delta } = e.currentTarget.dataset
    const num = util.num(delta)
    // 找到当前数量
    let cur = 0
    this.data.groups.forEach((g) => g.items.forEach((it) => { if (it.id === id) cur = it.num }))
    const next = cur + num
    const done = () => this.load()
    if (next <= 0) {
      api.cart.remove(id).then(done).catch(() => {})
    } else {
      api.cart.update({ id, pid, num: next }).then(done).catch(() => {})
    }
  },

  removeItem(e) {
    const id = e.currentTarget.dataset.id
    util.confirm('确定删除该商品？').then((yes) => {
      if (!yes) return
      api.cart.remove(id).then(() => this.load()).catch(() => {})
    })
  },

  clearGroup(e) {
    const bid = e.currentTarget.dataset.bid
    util.confirm('确定清空该商家的购物车？').then((yes) => {
      if (!yes) return
      api.cart.clearByBusiness(bid, auth.uid()).then(() => this.load()).catch(() => {})
    })
  },

  /** 结算某商家 */
  checkout(e) {
    const bid = e.currentTarget.dataset.bid
    wx.navigateTo({ url: '/pages/confirm/confirm?bid=' + bid })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
