/**
 * 后端接口封装（严格对应 Go 后端已实现路由）
 * 统一返回 Promise<data>
 */
const http = require('../utils/request')
const auth = require('../utils/auth')

/* ============================ 认证 ============================ */
const authApi = {
  /** 登录：返回用户对象（含 token） */
  login: (username, password) => http.post('/login', { username, password }),
  /** 管理后台注册（用户名 ≤10 位，密码 ≤20 位） */
  register: (data) => http.post('/register', data),
  /** 移动端注册：后端强制角色为「用户」 */
  appRegister: (data) => http.post('/appRegister', data),
  /** 忘记密码：用户名 + 手机号，重置为固定密码 123 */
  resetPassword: (data) => http.put('/password', data),
  /** 修改密码：{ id, password }，password 为新密码 */
  updatePassword: (id, password) => http.put('/user/updatePassword', { id, password }),
  /** 修改个人信息 */
  updateUser: (data) => http.put('/user/update', data),
  /** 用户详情 */
  userById: (id) => http.get('/user/selectById/' + id)
}

/* ============================ 商家 ============================ */
const businessApi = {
  /** 首页商家列表（公开） */
  listApp: () => http.get('/business/selectAllApp'),
  /** 商家详情（公开） */
  detail: (id) => http.get('/business/selectById/' + id),
  /** 全部商家（需登录） */
  listAll: () => http.get('/business/selectAll')
}

/* ============================ 分类 / 商品 ============================ */
const catalogApi = {
  /** 某商家的分类 */
  categoriesByBusiness: (bid) => http.get('/category/selectAllByBid/' + bid),
  /** 某分类下的商品 */
  productsByCategory: (cid) => http.get('/product/selectAllByCid/' + cid),
  /** 全部商品（公开，含商家名与分类名、realPrice） */
  allProducts: () => http.get('/product/selectByApp'),
  /**
   * 关键词搜索商品：后端无搜索接口，取全量后前端过滤
   * @param {string} keyword 关键词（匹配名称/描述/商家/分类）
   */
  search: (keyword) => {
    const kw = String(keyword || '').trim().toLowerCase()
    return http.get('/product/selectByApp').then((list) => {
      if (!kw) return list || []
      return (list || []).filter((p) => {
        const hay = [p.name, p.description, p.business, p.category]
          .map((s) => String(s || '').toLowerCase())
          .join(' ')
        return hay.indexOf(kw) >= 0
      })
    })
  }
}

/* ============================ 购物车 ============================ */
const cartApi = {
  /** 加购：同商家同商品数量累加 */
  add: (data) => http.post('/cart/add', data),
  /** 查询某商家下当前用户的购物车（含 product/business） */
  listByBusiness: (bid, uid) => http.get('/cart/selectAll/' + bid + '/' + uid),
  /** 当前登录用户全部购物车 */
  listAll: () => http.get('/cart/selectAllApp'),
  /** 修改数量 */
  update: (data) => http.put('/cart/update', data),
  /** 删除单条 */
  remove: (id) => http.del('/cart/delete/' + id),
  /** 清空某商家购物车 */
  clearByBusiness: (bid, uid) => http.del('/cart/deleteByBid/' + bid + '/' + uid),
  /** 金额计算：返回实付合计（数字） */
  calc: (uid, bid) => http.get('/cart/calc', { uid, bid })
}

/* ============================ 订单 ============================ */
const orderApi = {
  /**
   * 下单（事务：购物车 → 订单+明细 → 清空购物车）
   * data: { bid, user, addressId, phone, comment, payType }
   */
  addOrder: (data) => http.post('/orders/addOrder', data),
  /** 按状态查询本人订单：全部 / 进行中 / 待评价 / 退款 */
  listByStatus: (uid, status) =>
    http.get('/orders/selectOrders/' + uid + '/' + encodeURIComponent(status || '全部')),
  /** 订单详情 */
  detail: (id) => http.get('/orders/selectById/' + id),
  /** 更新订单（支付、确认收货、取消等） */
  update: (data) => http.put('/orders/update', data),
  /** 删除订单 */
  remove: (id) => http.del('/orders/delete/' + id),
  /** 订单明细 */
  items: (orderId) => http.get('/orderItem/selectByOrderId/' + orderId)
}

/* ============================ 地址 ============================ */
const addressApi = {
  list: (uid) => http.get('/address/selectAll/' + uid),
  detail: (id) => http.get('/address/selectById/' + id),
  add: (data) => http.post('/address/add', data),
  update: (data) => http.put('/address/update', data),
  remove: (id) => http.del('/address/delete/' + id)
}

/* ============================ 收藏 ============================ */
const collectApi = {
  /** 我的收藏（含 business） */
  list: (uid) => http.get('/collect/selectByUid/' + uid),
  /** 查询某商家是否已收藏：返回列表 */
  query: (uid, bid) => http.get('/collect/selectByUidBid/' + uid + '/' + bid),
  /** 收藏：{ uid, bid, businessName, isCollect:1 } */
  add: (data) => http.post('/collect/add', data),
  /** 取消/恢复收藏：{ id, isCollect } */
  update: (data) => http.put('/collect/update', data)
}

/* ============================ 评论 ============================ */
const commentApi = {
  /** 某商家的评价（公开） */
  listByBusiness: (bid) => http.get('/comment/selectAllByBid/' + bid),
  /** 我发表的评价 */
  listByUser: (uid) => http.get('/comment/selectAllByUid/' + uid),
  /** 发表评价：{ star, content, orderId } */
  add: (data) => http.post('/comment/add', data),
  /** 删除评价 */
  remove: (id) => http.del('/comment/delete/' + id)
}

/* ============================ 公告 / 轮播 ============================ */
const contentApi = {
  notices: () => http.get('/notice/selectAllApp'),
  noticeForUser: () => http.get('/notice/selectUserData'),
  banners: () => http.get('/banners/selectAll')
}

/* ============================ 文件 ============================ */
const fileApi = {
  upload: (filePath) => http.upload(filePath),
  fullUrl: http.fullUrl
}

/* ============================ 骑手（预留） ============================ */
const deliveryApi = {
  apply: (data) => http.post('/deliveryman/add', data),
  takeoutOrders: () => http.get('/orders/selectTakeout')
}

/** 登录并落地登录态 */
function loginAndStore(username, password) {
  return authApi.login(username, password).then((user) => {
    if (!user || !user.token) throw new Error('登录失败：未返回 token')
    const app = getApp()
    if (app) app.setUser(user)
    else auth.setUser(user)
    return user
  })
}

module.exports = {
  auth: authApi,
  business: businessApi,
  catalog: catalogApi,
  cart: cartApi,
  order: orderApi,
  address: addressApi,
  collect: collectApi,
  comment: commentApi,
  content: contentApi,
  file: fileApi,
  delivery: deliveryApi,
  loginAndStore
}
