const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    keyword: '',
    list: [],
    loading: true
  },

  onLoad(options) {
    const keyword = options && options.keyword ? decodeURIComponent(options.keyword) : ''
    this.setData({ keyword })
    this.search(keyword)
  },

  onPullDownRefresh() {
    this.search(this.data.keyword).then(() => wx.stopPullDownRefresh())
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearchConfirm() {
    this.search(this.data.keyword)
  },

  search(keyword) {
    this.setData({ loading: true })
    return api.catalog.search(keyword)
      .then((list) => {
        const mapped = (list || []).map((p) => Object.assign({}, p, {
          imgUrl: api.file.fullUrl(p.picture),
          priceText: util.priceText(p.price),
          realPriceText: util.priceText(p.realPrice),
          hasDiscount: util.num(p.realPrice) < util.num(p.price)
        }))
        this.setData({ list: mapped, loading: false })
      })
      .catch(() => this.setData({ loading: false }))
  },

  goBusiness(e) {
    const bid = e.currentTarget.dataset.bid
    if (bid) wx.navigateTo({ url: '/pages/detail/detail?id=' + bid })
  },

  clearKeyword() {
    this.setData({ keyword: '' })
    this.search('')
  },

  /** 冒烟：直接加入购物车（同商家同商品累加由后端处理） */
  addToCart(e) {
    if (!auth.isLogin()) return wx.navigateTo({ url: '/pages/login/login' })
    const p = e.currentTarget.dataset.item
    api.cart.add({ pid: p.id, bid: p.bid, num: 1 })
      .then(() => util.toast('已加入购物车', 'success'))
      .catch(() => {})
  }
})
