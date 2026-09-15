const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    banners: [],
    noticeList: [],
    noticeIndex: 0,
    noticeText: '',
    categories: [],
    businesses: [],
    loading: true,
    keyword: ''
  },

  _noticeTimer: null,

  onLoad() {
    this.loadAll()
  },

  onShow() {
    // 从收藏/详情返回时刷新商家列表（收藏状态可能变化）
    if (!this.data.loading) this.loadBusinesses()
  },

  onUnload() {
    this.clearNoticeTimer()
  },

  onHide() {
    this.clearNoticeTimer()
  },

  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh())
  },

  loadAll() {
    return Promise.all([
      this.loadBanners(),
      this.loadNotices(),
      this.loadCategories(),
      this.loadBusinesses()
    ]).then(() => this.setData({ loading: false })).catch(() => this.setData({ loading: false }))
  },

  loadBanners() {
    return api.content.banners().then((list) => {
      const banners = (list || []).filter((b) => b && (b.picture || b.url || b.image))
        .map((b) => Object.assign({}, b, {
          img: api.file.fullUrl(b.picture || b.url || b.image)
        }))
      this.setData({ banners })
    }).catch(() => {})
  },

  loadNotices() {
    return api.content.notices().then((list) => {
      const noticeList = (list || []).map((n) => ({
        id: n.id,
        title: n.title || '',
        text: util.plainText(n.content) || n.title || ''
      }))
      this.setData({ noticeList, noticeText: noticeList.length ? noticeList[0].text : '' })
      this.startNoticeTimer()
    }).catch(() => {})
  },

  /** 公告每 3 秒轮播一条 */
  startNoticeTimer() {
    this.clearNoticeTimer()
    if ((this.data.noticeList || []).length < 2) return
    this._noticeTimer = setInterval(() => {
      const next = (this.data.noticeIndex + 1) % this.data.noticeList.length
      this.setData({ noticeIndex: next, noticeText: this.data.noticeList[next].text })
    }, 3000)
  },

  clearNoticeTimer() {
    if (this._noticeTimer) {
      clearInterval(this._noticeTimer)
      this._noticeTimer = null
    }
  },

  /**
   * 分类入口：后端无「分类首页」接口，这里从公开商品列表中聚合出分类维度，
   * 既有真实数据支撑，也能在无数据时给出兜底入口。
   */
  loadCategories() {
    return api.catalog.allProducts().then((list) => {
      const seen = {}
      const categories = []
      ;(list || []).forEach((p) => {
        const name = p.category
        if (name && !seen[name]) {
          seen[name] = true
          categories.push({ name, cid: p.cid, bid: p.bid })
        }
      })
      this.setData({ categories: categories.slice(0, 8) })
    }).catch(() => {})
  },

  loadBusinesses() {
    return api.business.listApp().then((list) => {
      const businesses = (list || []).map((b) => Object.assign({}, b, {
        logoUrl: api.file.fullUrl(b.logo),
        scoreText: util.num(b.score) > 0 ? util.num(b.score).toFixed(1) : '暂无评分',
        minAmountText: util.priceText(b.minAmount),
        openText: b.openStatus === 1 ? '营业中' : '休息中',
        freeDelivery: util.num(b.minAmount) <= 0
      }))
      this.setData({ businesses })
    }).catch(() => {})
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearchConfirm() {
    const kw = String(this.data.keyword || '').trim()
    wx.navigateTo({ url: '/pages/product/product?keyword=' + encodeURIComponent(kw) })
  },

  goProductPage() {
    wx.navigateTo({ url: '/pages/product/product' })
  },

  goCategory(e) {
    const name = e.currentTarget.dataset.name
    wx.navigateTo({ url: '/pages/product/product?keyword=' + encodeURIComponent(name) })
  },

  goBusiness(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  goNotices() {
    const list = this.data.noticeList || []
    if (!list.length) return util.toast('暂无公告')
    wx.showModal({
      title: '系统公告',
      content: list.map((n) => '· ' + n.text).join('\n\n'),
      showCancel: false
    })
  },

  /** 需要登录的操作统一入口 */
  requireLogin() {
    if (auth.isLogin()) return true
    wx.navigateTo({ url: '/pages/login/login' })
    return false
  }
})
