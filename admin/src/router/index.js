import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '数据统计', icon: 'DataAnalysis' } },
      // 用户管理
      { path: 'user/user', name: 'UserList', component: () => import('@/views/user/User.vue'), meta: { title: '用户管理', icon: 'User' } },
      { path: 'user/admin', name: 'AdminList', component: () => import('@/views/user/Admin.vue'), meta: { title: '管理员管理', icon: 'Avatar' } },
      { path: 'user/address', name: 'AddressList', component: () => import('@/views/user/Address.vue'), meta: { title: '地址管理', icon: 'Location' } },
      // 商家管理
      { path: 'business/business', name: 'BusinessList', component: () => import('@/views/business/Business.vue'), meta: { title: '商家管理', icon: 'Shop' } },
      { path: 'business/category', name: 'CategoryList', component: () => import('@/views/business/Category.vue'), meta: { title: '分类管理', icon: 'Menu' } },
      { path: 'business/product', name: 'ProductList', component: () => import('@/views/business/Product.vue'), meta: { title: '商品管理', icon: 'Goods' } },
      // 交易管理
      { path: 'order/order', name: 'OrderList', component: () => import('@/views/order/Order.vue'), meta: { title: '订单管理', icon: 'Tickets' } },
      { path: 'order/orderItem', name: 'OrderItemList', component: () => import('@/views/order/OrderItem.vue'), meta: { title: '订单明细', icon: 'List' } },
      { path: 'order/comment', name: 'CommentList', component: () => import('@/views/order/Comment.vue'), meta: { title: '评论管理', icon: 'ChatDotRound' } },
      { path: 'order/collect', name: 'CollectList', component: () => import('@/views/order/Collect.vue'), meta: { title: '收藏管理', icon: 'Star' } },
      // 内容管理
      { path: 'content/notice', name: 'NoticeList', component: () => import('@/views/content/Notice.vue'), meta: { title: '公告管理', icon: 'Bell' } },
      { path: 'content/news', name: 'NewsList', component: () => import('@/views/content/News.vue'), meta: { title: '新闻管理', icon: 'Document' } },
      // 系统管理
      { path: 'system/banner', name: 'BannerList', component: () => import('@/views/system/Banner.vue'), meta: { title: '轮播图管理', icon: 'Picture' } },
      { path: 'system/deliveryman', name: 'DeliverymanList', component: () => import('@/views/system/Deliveryman.vue'), meta: { title: '骑手管理', icon: 'Bicycle' } },
      { path: 'system/logs', name: 'LogsList', component: () => import('@/views/system/Logs.vue'), meta: { title: '操作日志', icon: 'Memo' } },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} · 校园外卖后台` : '校园外卖后台'
  if (to.path !== '/login' && !localStorage.getItem('token')) {
    next('/login')
  } else {
    next()
  }
})

export default router