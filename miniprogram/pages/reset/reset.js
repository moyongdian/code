const api = require('../../api/index')
const util = require('../../utils/util')

Page({
  data: {
    username: '',
    phone: '',
    loading: false
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onSubmit() {
    const username = String(this.data.username || '').trim()
    const phone = String(this.data.phone || '').trim()
    if (!username) return util.toast('请输入用户名')
    if (!phone) return util.toast('请输入手机号')
    if (!util.isPhone(phone)) return util.toast('手机号格式不正确')
    if (this.data.loading) return

    this.setData({ loading: true })
    api.auth.resetPassword({ username, phone })
      .then(() => {
        wx.showModal({
          title: '重置成功',
          content: '密码已重置为 123，请登录后尽快在「个人中心 → 修改密码」中修改。',
          showCancel: false,
          success: () => {
            wx.redirectTo({ url: '/pages/login/login?username=' + encodeURIComponent(username) })
          }
        })
      })
      .catch(() => {})
      .then(() => this.setData({ loading: false }))
  }
})
