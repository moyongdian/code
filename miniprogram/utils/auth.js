/**
 * 登录态管理：token 与用户信息统一存本地缓存
 */
const USER_KEY = 'honey-user'
const TOKEN_KEY = 'honey-token'

/** 读取用户信息（含 token） */
function getUser() {
  try {
    return wx.getStorageSync(USER_KEY) || null
  } catch (e) {
    return null
  }
}

/** 写入用户信息 */
function setUser(user) {
  try {
    wx.setStorageSync(USER_KEY, user || null)
    if (user && user.token) wx.setStorageSync(TOKEN_KEY, user.token)
  } catch (e) {}
}

/** 取 token */
function getToken() {
  const u = getUser()
  if (u && u.token) return u.token
  try {
    return wx.getStorageSync(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

/** 清空登录态 */
function clear() {
  try {
    wx.removeStorageSync(USER_KEY)
    wx.removeStorageSync(TOKEN_KEY)
  } catch (e) {}
}

/** 是否已登录 */
function isLogin() {
  return !!getToken()
}

/** 当前用户 id */
function uid() {
  const u = getUser()
  return u ? Number(u.id) || 0 : 0
}

module.exports = { getUser, setUser, getToken, clear, isLogin, uid, USER_KEY, TOKEN_KEY }
