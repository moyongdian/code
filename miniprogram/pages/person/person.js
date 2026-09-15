const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    form: { username: '', name: '', phone: '', email: '', sex: 0, avatar: '' },
    avatarUrl: '',
    sexOptions: ['女', '男'],
    submitting: false,
    loading: true
  },

  onLoad() {
    const cached = auth.getUser() || {}
    this.applyUser(cached)
    this.load()
  },

  load() {
    if (!auth.isLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return Promise.resolve()
    }
    return api.auth.userById(auth.uid()).then((u) => {
      if (u) this.applyUser(u)
      this.setData({ loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  applyUser(u) {
    this.setData({
      form: {
        username: u.username || '',
        name: u.name || '',
        phone: u.phone || '',
        email: u.email || '',
        sex: util.num(u.sex),
        avatar: u.avatar || ''
      },
      avatarUrl: u.avatar ? api.file.fullUrl(u.avatar) : ''
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onSexChange(e) {
    this.setData({ 'form.sex': Number(e.detail.value) })
  },

  /** 选择并上传头像 */
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        wx.showLoading({ title: '上传中…', mask: true })
        api.file.upload(file.tempFilePath).then((data) => {
          wx.hideLoading()
          // 后端返回可直接访问的完整 URL
          const url = (data && (data.url || data)) || ''
          if (!url) throw new Error('上传返回为空')
          // 存相对路径或完整 URL 均可，后端按字符串保存
          this.setData({ 'form.avatar': url, avatarUrl: api.file.fullUrl(url) })
          util.toast('头像已上传')
        }).catch((err) => {
          wx.hideLoading()
          util.toast(err.message || '上传失败')
        })
      }
    })
  },

  submit() {
    const form = this.data.form
    const name = String(form.name || '').trim()
    const phone = String(form.phone || '').trim()
    const email = String(form.email || '').trim()

    if (!name) return util.toast('请填写姓名')
    if (phone && !util.isPhone(phone)) return util.toast('手机号格式不正确')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return util.toast('邮箱格式不正确')
    if (this.data.submitting) return

    this.setData({ submitting: true })
    // 注意：不要传 password 字段，否则会被后端当作改密处理
    api.auth.updateUser({
      id: auth.uid(),
      username: form.username,
      name,
      phone,
      email,
      sex: util.num(form.sex),
      avatar: form.avatar || ''
    }).then((u) => {
      // 同步本地缓存：必须保留 token（接口返回的 token 字段为空）
      const cached = auth.getUser() || {}
      const merged = Object.assign({}, cached, u || {}, {
        id: auth.uid(),
        username: form.username,
        name, phone, email,
        sex: util.num(form.sex),
        avatar: form.avatar || '',
        token: cached.token || auth.getToken()
      })
      const app = getApp()
      if (app) app.setUser(merged)
      else auth.setUser(merged)
      util.toast('已保存', 'success')
      setTimeout(() => wx.navigateBack(), 700)
    }).catch(() => {}).then(() => this.setData({ submitting: false }))
  }
})
