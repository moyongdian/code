const api = require('../../api/index')
const util = require('../../utils/util')

Page({
  data: {
    orderId: 0,
    order: null,
    star: 5,
    stars: [1, 2, 3, 4, 5],
    content: '',
    submitting: false,
    loading: true
  },

  onLoad(options) {
    const orderId = Number(options.id || 0)
    if (!orderId) {
      util.toast('缺少订单参数')
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ orderId })
    api.order.detail(orderId)
      .then((o) => this.setData({ order: o, loading: false }))
      .catch(() => this.setData({ loading: false }))
  },

  setStar(e) {
    this.setData({ star: util.num(e.currentTarget.dataset.star, 5) })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  submit() {
    const content = String(this.data.content || '').trim()
    if (!content) return util.toast('请填写评价内容')
    if (content.length < 2) return util.toast('评价内容太短了')
    if (this.data.submitting) return

    this.setData({ submitting: true })
    api.comment.add({
      star: this.data.star,
      content,
      orderId: this.data.orderId
    }).then(() => {
      util.toast('评价成功', 'success')
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) wx.navigateBack()
        else wx.switchTab({ url: '/pages/orders/orders' })
      }, 800)
    }).catch(() => {}).then(() => this.setData({ submitting: false }))
  }
})
