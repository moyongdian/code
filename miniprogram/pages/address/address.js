const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    list: [],
    selectMode: false,
    loading: true
  },

  onLoad(options) {
    this.setData({ selectMode: String(options.select || '') === '1' })
  },

  onShow() {
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    if (!auth.isLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return Promise.resolve()
    }
    this.setData({ loading: true })
    return api.address.list(auth.uid())
      .then((list) => this.setData({ list: list || [], loading: false }))
      .catch(() => this.setData({ loading: false }))
  },

  /** 选择模式下点击地址 → 回传给确认订单页 */
  choose(e) {
    if (!this.data.selectMode) return
    const addr = e.currentTarget.dataset.item
    const app = getApp()
    if (app) app.globalData.pickedAddress = addr
    wx.navigateBack()
  },

  edit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/addressEdit/addressEdit?id=' + id })
  },

  add() {
    wx.navigateTo({ url: '/pages/addressEdit/addressEdit' })
  },

  remove(e) {
    const id = e.currentTarget.dataset.id
    util.confirm('确定删除该地址？').then((yes) => {
      if (!yes) return
      api.address.remove(id).then(() => { util.toast('已删除'); this.load() }).catch(() => {})
    })
  },

  callPhone(e) {
    const phone = e.currentTarget.dataset.phone
    if (phone) wx.makePhoneCall({ phoneNumber: String(phone), fail: () => {} })
  }
})
