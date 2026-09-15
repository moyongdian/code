Page({
  data: {
    version: '1.0.0'
  },

  copyPhone() {
    wx.setClipboardData({ data: '0731-88886666' })
  },

  callService() {
    wx.makePhoneCall({ phoneNumber: '073188886666', fail: () => {} })
  }
})
