const api = require('../../api/index')
const util = require('../../utils/util')

Page({
  data: {
    id: 0,
    order: null,
    items: [],
    loading: true
  },

  onLoad(options) {
    const id = Number(options.id || 0)
    if (!id) {
      util.toast('缺少订单参数')
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ id })
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    this.setData({ loading: true })
    return Promise.all([
      api.order.detail(this.data.id),
      api.order.items(this.data.id)
    ]).then(([o, items]) => {
      if (!o) throw new Error('订单不存在')
      const status = o.status || ''
      const order = Object.assign({}, o, {
        statusText: util.statusText(status),
        statusColor: util.statusColor(status),
        amountText: util.money(o.amount),
        actualText: util.money(o.actual),
        discountText: util.money(util.num(o.amount) - util.num(o.actual)),
        timeText: util.friendlyTime(o.time),
        payTimeText: util.friendlyTime(o.payTime) || '未支付',
        coverUrl: api.file.fullUrl(o.cover),
        businessName: (o.business && o.business.name) || '',
        addressText: (o.address && o.address.address) || '',
        commentStatus: util.num(o.commentStatus),
        canPay: status === '待支付',
        canCancel: status === '待支付' || status === '待发货',
        canReceive: status === '待收货' || status === '已发货' || status === '正在配送',
        canComment: status === '已完成' && util.num(o.commentStatus) === 0
      })

      const mapped = (items || []).map((it) => ({
        id: it.id,
        name: it.productName || '',
        num: util.num(it.num),
        priceText: util.priceText(it.price),
        realPriceText: util.priceText(it.realPrice),
        imgUrl: api.file.fullUrl(it.productPicture)
      }))

      this.setData({ order, items: mapped, loading: false })
    }).catch((err) => {
      this.setData({ loading: false })
      util.toast(err.message || '加载失败')
    })
  },

  pay() {
    util.confirm('确认支付该订单？', '去支付').then((yes) => {
      if (!yes) return
      api.order.update({ id: this.data.id, status: '待发货' })
        .then(() => { util.toast('支付成功', 'success'); this.load() })
        .catch(() => {})
    })
  },

  receive() {
    util.confirm('确认已收到餐品？').then((yes) => {
      if (!yes) return
      api.order.update({ id: this.data.id, status: '已完成' })
        .then(() => { util.toast('已确认收货', 'success'); this.load() })
        .catch(() => {})
    })
  },

  cancel() {
    util.confirm('确定取消该订单？').then((yes) => {
      if (!yes) return
      api.order.update({ id: this.data.id, status: '已取消' })
        .then(() => { util.toast('订单已取消'); this.load() })
        .catch(() => {})
    })
  },

  goComment() {
    wx.navigateTo({ url: '/pages/comment/comment?id=' + this.data.id })
  },

  callPhone() {
    const phone = this.data.order && this.data.order.phone
    if (!phone) return util.toast('无联系电话')
    wx.makePhoneCall({ phoneNumber: String(phone), fail: () => {} })
  },

  copyOrderNo() {
    const no = this.data.order && this.data.order.orderNo
    if (!no) return
    wx.setClipboardData({ data: String(no) })
  }
})
