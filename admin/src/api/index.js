import request from '@/utils/request'

// ===== 登录 =====
export const apiLogin = (data) => request.post('/login', data)
export const apiRegister = (data) => request.post('/register', data)

// ===== 用户 / 管理员 =====
export const user = {
  list: (params) => request.get('/user/selectByPage', { params }),
  all: () => request.get('/user/selectAll'),
  add: (data) => request.post('/user/add', data),
  update: (data) => request.put('/user/update', data),
  remove: (id) => request.delete(`/user/delete/${id}`),
  batchRemove: (ids) => request.delete('/user/delete/batch', { data: ids }),
  resetPwd: (data) => request.put('/user/updatePassword', data),
}
export const admin = {
  list: (params) => request.get('/admin/selectByPage', { params }),
  all: () => request.get('/admin/selectAll'),
  add: (data) => request.post('/admin/add', data),
  update: (data) => request.put('/admin/update', data),
  remove: (id) => request.delete(`/admin/delete/${id}`),
  batchRemove: (ids) => request.delete('/admin/delete/batch', { data: ids }),
  resetPwd: (data) => request.put('/user/updatePassword', data),
}

// ===== 商家 =====
export const business = {
  list: (params) => request.get('/business/selectByPage', { params }),
  all: () => request.get('/business/selectAll'),
  add: (data) => request.post('/business/add', data),
  update: (data) => request.put('/business/update', data),
  remove: (id) => request.delete(`/business/delete/${id}`),
  batchRemove: (ids) => request.delete('/business/delete/batch', { data: ids }),
}

// ===== 分类 =====
export const category = {
  list: (params) => request.get('/category/selectByPage', { params }),
  all: () => request.get('/category/selectAll'),
  byBid: (bid) => request.get(`/category/selectAllByBid/${bid}`),
  add: (data) => request.post('/category/add', data),
  update: (data) => request.put('/category/update', data),
  remove: (id) => request.delete(`/category/delete/${id}`),
}

// ===== 商品 =====
export const product = {
  list: (params) => request.get('/product/selectByPage', { params }),
  all: () => request.get('/product/selectAll'),
  byCid: (cid) => request.get(`/product/selectAllByCid/${cid}`),
  add: (data) => request.post('/product/add', data),
  update: (data) => request.put('/product/update', data),
  remove: (id) => request.delete(`/product/delete/${id}`),
}

// ===== 购物车 =====
export const cart = {
  all: (bid, uid) => request.get(`/cart/selectAll/${bid}/${uid}`),
  list: () => request.get('/cart/selectAllApp'),
  add: (data) => request.post('/cart/add', data),
  update: (data) => request.put('/cart/update', data),
  remove: (id) => request.delete(`/cart/delete/${id}`),
}

// ===== 订单 =====
export const order = {
  list: (params) => request.get('/orders/selectByPage', { params }),
  all: () => request.get('/orders/selectAll'),
  byUser: (uid, status) => request.get(`/orders/selectOrders/${uid}/${encodeURIComponent(status)}`),
  detail: (id) => request.get(`/orders/selectById/${id}`),
  add: (data) => request.post('/orders/add', data),
  update: (data) => request.put('/orders/update', data),
  remove: (id) => request.delete(`/orders/delete/${id}`),
  batchRemove: (ids) => request.delete('/orders/delete/batch', { data: ids }),
}
export const orderItem = {
  all: () => request.get('/orderItem/selectAll'),
  byOrder: (orderId) => request.get(`/orderItem/selectByOrderId/${orderId}/`),
  add: (data) => request.post('/orderItem/add', data),
  update: (data) => request.put('/orderItem/update', data),
  remove: (id) => request.delete(`/orderItem/delete/${id}`),
}

// ===== 地址 =====
export const address = {
  list: (params) => request.get('/address/selectByPage', { params }),
  byUser: (userId) => request.get(`/address/selectAll/${userId}`),
  add: (data) => request.post('/address/add', data),
  update: (data) => request.put('/address/update', data),
  remove: (id) => request.delete(`/address/delete/${id}`),
}

// ===== 评论 =====
export const comment = {
  list: (params) => request.get('/comment/selectByPage', { params }),
  all: () => request.get('/comment/selectAll'),
  byBid: (bid) => request.get(`/comment/selectAllByBid/${bid}`),
  add: (data) => request.post('/comment/add', data),
  update: (data) => request.put('/comment/update', data),
  remove: (id) => request.delete(`/comment/delete/${id}`),
  batchRemove: (ids) => request.delete('/comment/delete/batch', { data: ids }),
}

// ===== 收藏 =====
export const collect = {
  list: (params) => request.get('/collect/selectByPage', { params }),
  all: () => request.get('/collect/selectAll'),
  byUid: (uid) => request.get(`/collect/selectByUid/${uid}`),
  add: (data) => request.post('/collect/add', data),
  update: (data) => request.put('/collect/update', data),
  remove: (id) => request.delete(`/collect/delete/${id}`),
}

// ===== 公告 =====
export const notice = {
  list: (params) => request.get('/notice/selectByPage', { params }),
  all: () => request.get('/notice/selectAll'),
  add: (data) => request.post('/notice/add', data),
  update: (data) => request.put('/notice/update', data),
  remove: (id) => request.delete(`/notice/delete/${id}`),
}

// ===== 新闻 =====
export const news = {
  list: (params) => request.get('/news/selectByPage', { params }),
  all: () => request.get('/news/selectAll'),
  add: (data) => request.post('/news/add', data),
  update: (data) => request.put('/news/update', data),
  remove: (id) => request.delete(`/news/delete/${id}`),
}

// ===== 日志 =====
export const logs = {
  list: (params) => request.get('/logs/selectByPage', { params }),
  remove: (id) => request.delete(`/logs/delete/${id}`),
  batchRemove: (ids) => request.delete('/logs/delete/batch', { data: ids }),
}

// ===== 轮播图 =====
export const banner = {
  publicList: () => request.get('/banners/selectAll'),
  all: () => request.get('/banner/selectAll'),
  add: (data) => request.post('/banner/add', data),
  update: (data) => request.put('/banner/update', data),
  remove: (id) => request.delete(`/banner/delete/${id}`),
}

// ===== 骑手 =====
export const deliveryman = {
  list: (params) => request.get('/deliveryman/selectByPage', { params }),
}

// ===== 统计 =====
export const stats = {
  charts: () => request.get('/charts'),
  dashboard: () => request.get('/dashboard'),
}

// ===== 文件 =====
export const fileApi = {
  uploadUrl: '/api/file/upload',
}

export default {
  user,
  admin,
  business,
  category,
  product,
  cart,
  order,
  orderItem,
  address,
  comment,
  collect,
  notice,
  news,
  logs,
  banner,
  deliveryman,
  stats,
  fileApi,
}