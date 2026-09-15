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
    return api.comment.listByUser(auth.uid())
      .then((list) => {
        const mapped = (list || []).map((c) => {
          const star = Math.max(0, Math.min(5, Math.round(util.num(c.star))))
          return {
            id: c.id,
            bid: util.num(c.bid),
            content: c.content || '',
            time: util.friendlyTime(c.time),
            star,
            // 星标布尔数组，避免在 WXML 中做字符串运算
            starArr: [1, 2, 3, 4, 5].map((i) => i <= star),
            businessName: (c.business && c.business.name) || (c.businessName || ('商家 #' + c.bid))
          }
        })
        this.setData({ list: mapped, loading: false })
      })
      .catch(() => this.setData({ loading: false }))
  },

  goBusiness(e) {
    const bid = e.currentTarget.dataset.bid
    if (bid) wx.navigateTo({ url: '/pages/detail/detail?id=' + bid })
  },

  remove(e) {
    const id = e.currentTarget.dataset.id
    util.confirm('确定删除该评价？').then((yes) => {
      if (!yes) return
      api.comment.remove(id).then(() => { util.toast('已删除'); this.load() }).catch(() => {})
    })
  }
})
