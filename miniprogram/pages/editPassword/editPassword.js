const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const http = require('../../utils/request')

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirm: '',
    submitting: false
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  /** 用当前账号与旧密码做一次登录校验，确认操作人身份 */
  verifyOldPassword(oldPassword) {
    const user = auth.getUser() || {}
    const username = user.username
    if (!username) return Promise.reject(new Error('登录信息缺失，请重新登录'))
    // 使用免打扰模式，避免校验失败时弹出多余提示
    return http.post('/login', { username, password: oldPassword }, { hideError: true })
      .then(() => true)
      .catch(() => { throw new Error('旧密码不正确') })
  },

  submit() {
    const oldPassword = String(this.data.oldPassword || '')
    const newPassword = String(this.data.newPassword || '')
    const confirm = String(this.data.confirm || '')

    if (!oldPassword) return util.toast('请输入旧密码')
    if (!newPassword) return util.toast('请输入新密码')
    if (newPassword.length < 6) return util.toast('新密码至少 6 位')
    if (newPassword.length > 20) return util.toast('新密码不能超过 20 位')
    if (newPassword !== confirm) return util.toast('两次输入的新密码不一致')
    if (newPassword === oldPassword) return util.toast('新密码不能与旧密码相同')
    if (this.data.submitting) return

    this.setData({ submitting: true })
    this.verifyOldPassword(oldPassword)
      .then(() => api.auth.updatePassword(auth.uid(), newPassword))
      .then(() => {
        // 后端改密后 tokenVersion 自增，当前 token 已失效，需重新登录
        const app = getApp()
        if (app) app.setUser(null)
        else auth.clear()
        wx.showModal({
          title: '修改成功',
          content: '密码已更新，请使用新密码重新登录。',
          showCancel: false,
          success: () => {
            wx.reLaunch({ url: '/pages/login/login' })
          }
        })
      })
      .catch((err) => {
        util.toast(err.message || '修改失败')
      })
      .then(() => this.setData({ submitting: false }))
  }
})
