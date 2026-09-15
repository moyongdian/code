const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    logged: false,
    user: null,
    avatarUrl: '',
    orderCounts: { pending: 0, delivering: 0, toComment: 0 },
    hasDeliveryEntry: false
  },

  onShow() {
    const logged = auth.isLogin()
    const user = auth.getUser()
    this.setData({
      logged,
      user,
      avatarUrl: user && user.avatar ? api.file.fullUrl(user.avatar) : '',
      hasDeliveryEntry: !!(user && user.realStatus)
    })
    if (logged) {
      this.loadCounts()
      this.refreshProfile()
    }
  },

  onPullDownRefresh() {
    this.refreshProfile().then(() => this.loadCounts()).then(() => wx.stopPullDownRefresh())
  },

  /** 拉取最新用户信息，保持本地缓存同步 */
  refreshProfile() {
    if (!auth.isLogin()) return Promise.resolve()
    const cached = auth.getUser() || {}
    return api.auth.userById(auth.uid()).then((u) => {
      if (!u) return
      // 关键：userById 返回的 token 为空字符串，绝不能覆盖本地有效 token，
      // 否则后续所有需要鉴权的请求都会 401。
      const merged = Object.assign({}, cached, u, { token: cached.token || auth.getToken() })
      const app = getApp()
      if (app) app.setUser(merged)
      else auth.setUser(merged)
      this.setData({
        user: merged,
        avatarUrl: merged.avatar ? api.file.fullUrl(merged.avatar) : ''
      })
    }).catch(() => {})
  },

  /** 统计各状态订单数量（用于角标） */
  loadCounts() {
    if (!auth.isLogin()) return Promise.resolve()
    const tasks = ['进行中', '待评价'].map((s) =>
      api.order.listByStatus(auth.uid(), s).catch(() => []))
    return Promise.all(tasks).then(([progress, toComment]) => {
      const list = progress || []
      this.setData({
        orderCounts: {
          pending: list.filter((o) => o.status === '待支付').length,
          delivering: list.filter((o) => o.status === '待发货' || o.status === '待收货' || o.status === '正在配送').length,
          toComment: (toComment || []).length
        }
      })
    })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goOrders(e) {
    const tab = e.currentTarget.dataset.tab
    if (!auth.isLogin()) return this.goLogin()
    // tabBar 页面不能带参数跳转，用全局变量传递目标标签
    const app = getApp()
    if (app) app.globalData.ordersTab = tab || '全部'
    wx.switchTab({ url: '/pages/orders/orders' })
  },

  goAddress() {
    if (!auth.isLogin()) return this.goLogin()
    wx.navigateTo({ url: '/pages/address/address' })
  },

  goCollect() {
    if (!auth.isLogin()) return this.goLogin()
    wx.navigateTo({ url: '/pages/collect/collect' })
  },

  goMyComment() {
    if (!auth.isLogin()) return this.goLogin()
    wx.navigateTo({ url: '/pages/myComment/myComment' })
  },

  goPerson() {
    if (!auth.isLogin()) return this.goLogin()
    wx.navigateTo({ url: '/pages/person/person' })
  },

  goEditPassword() {
    if (!auth.isLogin()) return this.goLogin()
    wx.navigateTo({ url: '/pages/editPassword/editPassword' })
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  goTakeout() {
    util.toast('骑手接单端将在下一阶段开放')
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：0731-88886666\n服务时间：09:00 - 21:00',
      confirmText: '拨打电话',
      success: (r) => {
        if (r.confirm) wx.makePhoneCall({ phoneNumber: '073188886666', fail: () => {} })
      }
    })
  },

  logout() {
    util.confirm('确定退出登录？').then((yes) => {
      if (!yes) return
      const app = getApp()
      if (app) app.setUser(null)
      else auth.clear()
      this.setData({
        logged: false,
        user: null,
        avatarUrl: '',
        orderCounts: { pending: 0, delivering: 0, toComment: 0 },
        hasDeliveryEntry: false
      })
      util.toast('已退出登录')
    })
  }
})
