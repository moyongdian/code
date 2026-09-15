const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    list: [],
    loading: true
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
    return api.collect.list(auth.uid())
      .then((list) => {
        // 后端 /collect/selectByUid/:uid 已按 is_collect=1 过滤，
        // 并且直接返回「商家列表」（Business 数组），不是收藏记录本身。
        const mapped = (list || []).map((b) => ({
          bid: b.id,
          name: b.name || '',
          logoUrl: api.file.fullUrl(b.logo),
          scoreText: util.num(b.score) > 0 ? util.num(b.score).toFixed(1) : '暂无评分',
          openText: util.num(b.openStatus) === 1 ? '营业中' : '休息中',
          address: b.address || '',
          introduce: b.introduce || '',
          minAmountText: util.priceText(b.minAmount)
        }))
        this.setData({ list: mapped, loading: false })
      })
      .catch(() => this.setData({ loading: false }))
  },

  goBusiness(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.bid })
  },

  cancelCollect(e) {
    const bid = e.currentTarget.dataset.bid
    util.confirm('确定取消收藏该商家？').then((yes) => {
      if (!yes) return
      api.collect.update({ bid }).then(() => { util.toast('已取消收藏'); this.load() }).catch(() => {})
    })
  },

  goIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
