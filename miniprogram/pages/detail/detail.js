const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    bid: 0,
    business: null,
    categories: [],
    activeCid: 0,
    products: [],
    comments: [],
    tab: 'goods', // goods | comments
    isCollect: false,

    // 购物车
    cartList: [],
    cartMap: {},      // pid -> 数量
    cartCount: 0,
    cartTotal: '0.00',
    showCart: false,

    loading: true
  },

  onLoad(options) {
    const bid = Number(options.id || 0)
    if (!bid) {
      util.toast('缺少商家参数')
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ bid })
    this.loadBusiness()
    this.loadCategories()
    this.loadComments()
    this.loadCollectState()
    this.refreshCart()
  },

  /* -------------------- 商家信息 -------------------- */
  loadBusiness() {
    return api.business.detail(this.data.bid).then((b) => {
      if (!b) return
      this.setData({
        business: Object.assign({}, b, {
          logoUrl: api.file.fullUrl(b.logo),
          nameInitial: String(b.name || '?').trim().charAt(0) || '?',
          scoreText: util.num(b.score) > 0 ? util.num(b.score).toFixed(1) : '暂无评分',
          minAmountText: util.priceText(b.minAmount),
          openText: b.openStatus === 1 ? '营业中' : '休息中'
        })
      })
    }).catch(() => {})
  },

  /* -------------------- 分类与商品 -------------------- */
  loadCategories() {
    return api.catalog.categoriesByBusiness(this.data.bid).then((list) => {
      const categories = list || []
      this.setData({ categories })
      if (categories.length) this.loadProducts(categories[0].id)
      else this.setData({ loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  loadProducts(cid) {
    if (!cid) return Promise.resolve()
    this.setData({ loading: true })
    return api.catalog.productsByCategory(cid).then((list) => {
      const products = (list || []).map((p) => Object.assign({}, p, {
        imgUrl: api.file.fullUrl(p.picture),
        priceText: util.priceText(p.price),
        realPriceText: util.priceText(p.realPrice),
        hasDiscount: util.num(p.realPrice) < util.num(p.price),
        num: this.data.cartMap[p.id] || 0
      }))
      this.setData({ products, activeCid: cid, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  switchCategory(e) {
    const cid = e.currentTarget.dataset.cid
    if (cid === this.data.activeCid) return
    this.loadProducts(cid)
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  /* -------------------- 评价 -------------------- */
  loadComments() {
    return api.comment.listByBusiness(this.data.bid).then((list) => {
      const comments = (list || []).map((c) => {
        const userName = (c.user && (c.user.name || c.user.username)) || '匿名用户'
        return {
          id: c.id,
          star: util.num(c.star),
          starText: '★★★★★'.slice(0, Math.max(0, Math.round(util.num(c.star)))),
          content: c.content || '',
          time: util.friendlyTime(c.time),
          userName,
          userInitial: String(userName).trim().charAt(0) || '匿'
        }
      })
      this.setData({ comments })
    }).catch(() => {})
  },

  /* -------------------- 收藏 -------------------- */
  loadCollectState() {
    if (!auth.isLogin()) return Promise.resolve()
    return api.collect.query(auth.uid(), this.data.bid).then((col) => {
      // 后端查不到时返回零值对象，isCollect 为 0
      this.setData({ isCollect: !!(col && util.num(col.isCollect) === 1) })
    }).catch(() => {})
  },

  toggleCollect() {
    if (!this.requireLogin()) return
    const biz = this.data.business || {}
    const next = !this.data.isCollect
    const done = () => {
      this.setData({ isCollect: next })
      util.toast(next ? '已收藏' : '已取消收藏')
    }
    if (next) {
      api.collect.add({ bid: this.data.bid, businessName: biz.name || '' }).then(done).catch(() => {})
    } else {
      api.collect.update({ bid: this.data.bid }).then(done).catch(() => {})
    }
  },

  /* -------------------- 购物车 -------------------- */
  refreshCart() {
    if (!auth.isLogin()) return Promise.resolve()
    return api.cart.listByBusiness(this.data.bid, auth.uid()).then((list) => {
      this.applyCart(list || [])
    }).catch(() => {})
  },

  applyCart(list) {
    const cartMap = {}
    let count = 0
    let total = 0
    const cartList = (list || []).map((c) => {
      const p = c.product || {}
      const num = util.num(c.num)
      cartMap[c.pid] = num
      count += num
      total += util.num(p.realPrice) * num
      return {
        id: c.id,
        pid: c.pid,
        num,
        name: p.name || '',
        imgUrl: api.file.fullUrl(p.picture),
        realPriceText: util.priceText(p.realPrice),
        lineTotal: util.money(util.num(p.realPrice) * num)
      }
    })
    const products = (this.data.products || []).map((p) =>
      Object.assign({}, p, { num: cartMap[p.id] || 0 }))

    this.setData({
      cartList, cartMap, cartCount: count, cartTotal: util.money(total), products
    })
  },

  /** 加购（+1） */
  addToCart(e) {
    if (!this.requireLogin()) return
    const p = e.currentTarget.dataset.item
    const pid = p.id
    api.cart.add({ pid, bid: this.data.bid, num: 1 })
      .then(() => this.refreshCart())
      .catch(() => {})
  },

  /** 购物车弹层内加减 */
  changeNum(e) {
    const { id, pid, delta } = e.currentTarget.dataset
    const cur = this.data.cartMap[pid] || 0
    const next = cur + Number(delta)
    if (next <= 0) {
      return api.cart.remove(id).then(() => this.refreshCart()).catch(() => {})
    }
    return api.cart.update({ id, pid, num: next }).then(() => this.refreshCart()).catch(() => {})
  },

  clearCart() {
    util.confirm('确定清空本商家的购物车？').then((yes) => {
      if (!yes) return
      api.cart.clearByBusiness(this.data.bid, auth.uid())
        .then(() => this.refreshCart())
        .catch(() => {})
    })
  },

  toggleCartPanel() {
    if (!this.data.cartCount) return util.toast('购物车还是空的')
    this.setData({ showCart: !this.data.showCart })
  },

  closeCartPanel() {
    this.setData({ showCart: false })
  },

  /** 阻止弹层内部点击冒泡关闭 */
  noop() {},

  /* -------------------- 下单 -------------------- */
  goConfirm() {
    if (!this.data.cartCount) return util.toast('请先选购商品')
    if (!this.requireLogin()) return
    const biz = this.data.business || {}
    if (util.num(biz.minAmount) > 0 && Number(this.data.cartTotal) < util.num(biz.minAmount)) {
      return util.toast('还差 ¥' + util.money(util.num(biz.minAmount) - Number(this.data.cartTotal)) + ' 起送')
    }
    wx.navigateTo({ url: '/pages/confirm/confirm?bid=' + this.data.bid })
  },

  requireLogin() {
    if (auth.isLogin()) return true
    wx.navigateTo({ url: '/pages/login/login' })
    return false
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.previewImage({ urls: [url], current: url })
  }
})
