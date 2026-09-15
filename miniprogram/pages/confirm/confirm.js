const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    bid: 0,
    business: null,
    items: [],
    addresses: [],
    address: null,
    remark: '',
    payType: '微信',
    payTypes: ['微信', '支付宝'],
    amount: '0.00',
    discount: '0.00',
    packFee: '0.00',
    actual: '0.00',
    totalCount: 0,
    submitting: false,
    loading: true
  },

  onLoad(options) {
    const bid = Number(options.bid || 0)
    this.setData({ bid })
    this.load()
  },

  /** 从地址页返回时同步选中的地址 */
  onShow() {
    const app = getApp()
    const picked = app && app.globalData && app.globalData.pickedAddress
    if (picked) {
      app.globalData.pickedAddress = null
      this.setData({ address: picked })
    }
  },

  load() {
    if (!auth.isLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return Promise.resolve()
    }
    this.setData({ loading: true })
    return Promise.all([
      api.business.detail(this.data.bid),
      api.cart.listByBusiness(this.data.bid, auth.uid()),
      api.address.list(auth.uid())
    ]).then(([biz, cart, addresses]) => {
      const items = (cart || []).map((c) => {
        const p = c.product || {}
        const num = util.num(c.num)
        return {
          id: c.id,
          pid: c.pid,
          num,
          name: p.name || '',
          imgUrl: api.file.fullUrl(p.picture),
          priceText: util.priceText(p.price),
          realPriceText: util.priceText(p.realPrice),
          lineTotal: util.money(util.num(p.realPrice) * num)
        }
      })

      // 后端金额口径：实付 = Σ(原价×0.7×数量) 保留两位
      const originAmount = items.reduce((s, it) => s + util.num(it.priceText) * it.num, 0)
      const actualAmount = items.reduce((s, it) => s + util.num(it.realPriceText) * it.num, 0)

      const addrList = addresses || []
      this.setData({
        business: biz,
        items,
        addresses: addrList,
        address: this.data.address || addrList[0] || null,
        amount: util.money(originAmount),
        discount: util.money(originAmount - actualAmount),
        actual: util.money(actualAmount),
        totalCount: items.reduce((s, it) => s + it.num, 0),
        loading: false
      })

      if (!items.length) {
        util.toast('购物车为空，请先选购商品')
        setTimeout(() => wx.navigateBack(), 900)
      }
    }).catch(() => this.setData({ loading: false }))
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  choosePayType(e) {
    this.setData({ payType: e.currentTarget.dataset.type })
  },

  goAddress() {
    wx.navigateTo({ url: '/pages/address/address?select=1' })
  },

  goAddAddress() {
    wx.navigateTo({ url: '/pages/addressEdit/addressEdit' })
  },

  submit() {
    const { address, items, business, bid, payType, remark } = this.data
    if (!items.length) return util.toast('购物车为空')
    if (!address) return util.toast('请先添加收货地址')
    if (!util.isPhone(address.phone)) return util.toast('收货电话格式不正确')
    if (this.data.submitting) return

    this.setData({ submitting: true })
    api.order.addOrder({
      bid,
      user: address.user || '',
      addressId: address.id,
      phone: address.phone || '',
      comment: remark || '',
      payType: payType || '微信'
    }).then(() => {
      wx.showToast({ title: '下单成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/orders/orders' })
      }, 700)
    }).catch(() => {}).then(() => this.setData({ submitting: false }))
  }
})
