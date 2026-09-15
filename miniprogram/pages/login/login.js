const api = require('../../api/index')
const auth = require('../../utils/auth')
const util = require('../../utils/util')

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onLoad(options) {
    // 已登录则直接返回
    if (auth.isLogin()) {
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
    }
    if (options && options.username) this.setData({ username: options.username })
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onSubmit() {
    const username = String(this.data.username || '').trim()
    const password = String(this.data.password || '')
    if (!username) return util.toast('请输入用户名')
    if (!password) return util.toast('请输入密码')
    if (this.data.loading) return

    this.setData({ loading: true })
    api.loginAndStore(username, password)
      .then((user) => {
        util.toast('登录成功', 'success')
        setTimeout(() => {
          const pages = getCurrentPages()
          if (pages.length > 1) wx.navigateBack()
          else wx.switchTab({ url: '/pages/index/index' })
        }, 500)
      })
      .catch(() => {})
      .then(() => this.setData({ loading: false }))
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  goReset() {
    wx.navigateTo({ url: '/pages/reset/reset' })
  },

  /** 演示账号快速填充，便于联调 */
  useDemo(e) {
    const map = {
      user: { username: 'test', password: '123456' },
      shop: { username: 'shop', password: '123456' },
      admin: { username: 'admin', password: 'admin123' }
    }
    const d = map[e.currentTarget.dataset.k]
    if (d) this.setData(d)
  }
})
