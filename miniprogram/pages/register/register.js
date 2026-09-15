const api = require('../../api/index')
const util = require('../../utils/util')

Page({
  data: {
    username: '',
    password: '',
    confirm: '',
    name: '',
    phone: '',
    loading: false
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onSubmit() {
    const username = String(this.data.username || '').trim()
    const password = String(this.data.password || '')
    const confirm = String(this.data.confirm || '')
    const name = String(this.data.name || '').trim()
    const phone = String(this.data.phone || '').trim()

    // 后端硬限制：用户名 ≤ 10 位、密码 ≤ 20 位
    if (!username) return util.toast('请输入用户名')
    if (username.length > 10) return util.toast('用户名不能超过 10 个字符')
    if (!password) return util.toast('请输入密码')
    if (password.length < 6) return util.toast('密码至少 6 位')
    if (password.length > 20) return util.toast('密码不能超过 20 位')
    if (password !== confirm) return util.toast('两次输入的密码不一致')
    if (phone && !util.isPhone(phone)) return util.toast('手机号格式不正确')
    if (this.data.loading) return

    const payload = { username, password }
    if (name) payload.name = name
    if (phone) payload.phone = phone

    this.setData({ loading: true })
    api.auth.appRegister(payload)
      .then(() => {
        util.toast('注册成功', 'success')
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/login/login?username=' + encodeURIComponent(username) })
        }, 700)
      })
      .catch(() => {})
      .then(() => this.setData({ loading: false }))
  },

  goLogin() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/login/login' }) })
  }
})
