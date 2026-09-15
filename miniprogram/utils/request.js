/**
 * 后端请求封装
 *
 * 后端约定：
 *   - 统一响应体 {code, msg, data}，HTTP 状态码始终 200
 *   - code 200 成功；401 认证失效；500 业务/系统错误
 *   - 鉴权通过请求头 token 传递 JWT
 *
 * 本模块把 {code,msg,data} 解包成 Promise<data>，失败统一 reject(Error(msg))，
 * 401 自动清理登录态并跳转登录页。
 */
const auth = require('./auth')

/** 后端地址：与 app.js 中 baseUrl 保持一致 */
function baseUrl() {
  const app = getApp()
  return (app && app.globalData && app.globalData.baseUrl) || 'http://localhost:9090'
}

/** 拼接完整 URL（后端返回的图片/文件地址可能是相对路径） */
function fullUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return baseUrl() + (path[0] === '/' ? path : '/' + path)
}

let redirecting = false

/** 认证失效处理：清理登录态并跳登录页 */
function handleUnauth(msg) {
  auth.clear()
  const app = getApp()
  if (app) app.globalData.userInfo = null
  if (redirecting) return
  redirecting = true
  wx.showToast({ title: msg || '登录已失效，请重新登录', icon: 'none' })
  setTimeout(() => {
    wx.navigateTo({ url: '/pages/login/login', complete: () => { redirecting = false } })
  }, 600)
}

/**
 * 发起请求
 * @param {string} url    路径，如 /business/selectAllApp
 * @param {object} opts   { method, data, header, hideError, raw }
 * @returns Promise<data>
 */
function request(url, opts) {
  opts = opts || {}
  const method = (opts.method || 'GET').toUpperCase()
  const header = Object.assign({ 'Content-Type': 'application/json' }, opts.header || {})
  const token = auth.getToken()
  if (token) header.token = token

  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl() + url,
      method,
      data: opts.data || {},
      header,
      timeout: opts.timeout || 15000,
      success(res) {
        // HTTP 层错误
        if (res.statusCode === 401) {
          handleUnauth()
          reject(new Error('登录已失效，请重新登录'))
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const msg = '网络异常（HTTP ' + res.statusCode + '）'
          if (!opts.hideError) wx.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
          return
        }

        const body = res.data
        // 非统一响应体（如导出文件流）直接返回
        if (!body || typeof body !== 'object' || body.code === undefined) {
          resolve(body)
          return
        }

        if (body.code === 200) {
          resolve(body.data)
          return
        }

        // 业务错误：401 走认证失效
        if (body.code === 401) {
          handleUnauth(body.msg)
          reject(new Error(body.msg || '登录已失效，请重新登录'))
          return
        }

        const msg = body.msg || '请求失败'
        if (!opts.hideError) wx.showToast({ title: msg, icon: 'none' })
        reject(new Error(msg))
      },
      fail(err) {
        const msg = /timeout/i.test(err.errMsg || '')
          ? '请求超时，请检查后端是否已启动'
          : '无法连接后端服务，请检查网络与服务地址'
        if (!opts.hideError) wx.showToast({ title: msg, icon: 'none' })
        reject(new Error(msg))
      }
    })
  })
}

/** 便捷方法 */
const get = (url, data, opts) => request(url, Object.assign({ method: 'GET', data }, opts))
const post = (url, data, opts) => request(url, Object.assign({ method: 'POST', data }, opts))
const put = (url, data, opts) => request(url, Object.assign({ method: 'PUT', data }, opts))
const del = (url, data, opts) => request(url, Object.assign({ method: 'DELETE', data }, opts))

/** 文件上传（multipart），返回 {url} */
function upload(filePath) {
  return new Promise((resolve, reject) => {
    const token = auth.getToken()
    wx.uploadFile({
      url: baseUrl() + '/file/upload',
      filePath,
      name: 'file',
      header: token ? { token } : {},
      success(res) {
        try {
          const body = JSON.parse(res.data)
          if (body.code === 200) resolve(body.data)
          else reject(new Error(body.msg || '上传失败'))
        } catch (e) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail() {
        reject(new Error('上传失败，请检查网络'))
      }
    })
  })
}

module.exports = { request, get, post, put, del, upload, baseUrl, fullUrl }
