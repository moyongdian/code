const api = require('../../api/index')
const util = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    id: 0,
    form: { address: '', user: '', phone: '', userId: 0 },
    isEdit: false,
    submitting: false
  },

  onLoad(options) {
    const id = Number(options.id || 0)
    if (id) {
      this.setData({ id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑地址' })
      api.address.detail(id).then((a) => {
        if (!a) return
        this.setData({
          form: {
            address: a.address || '',
            user: a.user || '',
            phone: a.phone || '',
            userId: util.num(a.userId)
          }
        })
      }).catch(() => {})
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' })
      this.setData({ 'form.userId': auth.uid() })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  submit() {
    const { id, isEdit } = this.data
    const form = this.data.form
    const user = String(form.user || '').trim()
    const phone = String(form.phone || '').trim()
    const address = String(form.address || '').trim()

    if (!user) return util.toast('请填写联系人')
    if (!phone) return util.toast('请填写联系电话')
    if (!util.isPhone(phone)) return util.toast('手机号格式不正确')
    if (!address) return util.toast('请填写详细地址')
    if (address.length < 4) return util.toast('详细地址太短了')
    if (this.data.submitting) return

    this.setData({ submitting: true })
    // 更新接口使用全字段覆盖，必须回传 userId 以免被清零
    const payload = {
      address,
      user,
      phone,
      userId: util.num(form.userId) || auth.uid()
    }
    const task = isEdit
      ? api.address.update(Object.assign({ id }, payload))
      : api.address.add(payload)

    task.then(() => {
      util.toast(isEdit ? '已保存' : '已添加', 'success')
      setTimeout(() => wx.navigateBack(), 600)
    }).catch(() => {}).then(() => this.setData({ submitting: false }))
  }
})
