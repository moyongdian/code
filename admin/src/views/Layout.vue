<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">🏫 校园外卖后台</div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#1f2d3d"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon><span>数据统计</span>
        </el-menu-item>

        <el-sub-menu index="user">
          <template #title>
            <el-icon><User /></el-icon><span>用户管理</span>
          </template>
          <el-menu-item index="/user/user">用户管理</el-menu-item>
          <el-menu-item index="/user/admin">管理员管理</el-menu-item>
          <el-menu-item index="/user/address">地址管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="business">
          <template #title>
            <el-icon><Shop /></el-icon><span>商家管理</span>
          </template>
          <el-menu-item index="/business/business">商家管理</el-menu-item>
          <el-menu-item index="/business/category">分类管理</el-menu-item>
          <el-menu-item index="/business/product">商品管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="order">
          <template #title>
            <el-icon><Tickets /></el-icon><span>交易管理</span>
          </template>
          <el-menu-item index="/order/order">订单管理</el-menu-item>
          <el-menu-item index="/order/orderItem">订单明细</el-menu-item>
          <el-menu-item index="/order/comment">评论管理</el-menu-item>
          <el-menu-item index="/order/collect">收藏管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="content">
          <template #title>
            <el-icon><Document /></el-icon><span>内容管理</span>
          </template>
          <el-menu-item index="/content/notice">公告管理</el-menu-item>
          <el-menu-item index="/content/news">新闻管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="system">
          <template #title>
            <el-icon><Setting /></el-icon><span>系统管理</span>
          </template>
          <el-menu-item index="/system/banner">轮播图管理</el-menu-item>
          <el-menu-item index="/system/deliveryman">骑手管理</el-menu-item>
          <el-menu-item index="/system/logs">操作日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="page-title">{{ $route.meta.title }}</div>
        <div class="right">
          <el-dropdown @command="onCommand">
            <span class="user">
              <el-avatar :size="30" class="avatar">{{ store.nickname.slice(0, 1) }}</el-avatar>
              {{ store.nickname }}
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const store = useUserStore()

function onCommand(cmd) {
  if (cmd === 'logout') {
    store.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  background: #1f2d3d;
  overflow-x: hidden;
}
.aside :deep(.el-menu) {
  border-right: none;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  background: #17222f;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #303133;
}
.avatar {
  background: #409eff;
}
.main {
  padding: 16px;
  overflow: auto;
}
</style>