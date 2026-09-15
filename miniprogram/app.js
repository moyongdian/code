/**
 * 校园外卖点餐平台 — 小程序全局逻辑
 */
const auth = require('./utils/auth')

App({
  globalData: {
    // 后端服务地址。真机调试/发布需改为 HTTPS 域名，
    // 并在微信公众平台「开发管理 → 服务器域名」加入 request 合法域名。
    baseUrl: 'http://localhost:9090',
    userInfo: null,
    // 下单时在页面间传递的临时数据（地址等）
    pendingOrder: null
  },

  onLaunch() {
    // 恢复本地登录态
    const user = auth.getUser()
    if (user) this.globalData.userInfo = user
  },

  /** 统一设置登录态 */
  setUser(user) {
    this.globalData.userInfo = user || null
    if (user) auth.setUser(user)
    else auth.clear()
  }
})
