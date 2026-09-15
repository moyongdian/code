<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="4" v-for="card in cards" :key="card.label">
        <el-card shadow="hover">
          <div class="card">
            <div class="card-icon" :style="{ background: card.color }">
              <el-icon :size="22"><component :is="card.icon" /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ card.value }}</div>
              <div class="card-label">{{ card.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>近 30 天订单销售趋势</template>
          <div ref="lineRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>每日实付金额分布</template>
          <div ref="barRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>商品销售额 Top 10</template>
          <div ref="pieRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>订单状态分布</template>
          <div ref="statusRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { stats, order } from '@/api'

const cards = ref([])
const lineRef = ref()
const barRef = ref()
const pieRef = ref()
const statusRef = ref()
const charts = []

function render(el, option) {
  if (!el) return
  const chart = echarts.init(el)
  chart.setOption(option)
  charts.push(chart)
}

function initCharts(data) {
  const line = (data.line || []).slice().reverse()
  render(lineRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: line.map((i) => i.date) },
    yAxis: { type: 'value' },
    series: [{ name: '实付金额', type: 'line', smooth: true, areaStyle: {}, data: line.map((i) => i.value) }],
  })

  const bar = (data.bar || []).slice().reverse()
  render(barRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: bar.map((i) => i.name) },
    series: [{ name: '销售额', type: 'bar', barWidth: 16, data: bar.map((i) => i.value) }],
  })

  render(pieRef.value, {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 10, top: 'center' },
    series: [
      {
        name: '商品销售额',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['58%', '50%'],
        data: (data.bar || []).map((i) => ({ name: i.name, value: i.value })),
      },
    ],
  })

  const pieData = (data.pie || []).map((i) => ({ name: i.name, value: i.value }))
  render(statusRef.value, {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 10, top: 'center' },
    series: [
      {
        name: '订单状态',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['58%', '50%'],
        data: pieData.length ? pieData : [{ name: '暂无数据', value: 1 }],
      },
    ],
  })
}

async function loadData() {
  const [d, c] = await Promise.all([stats.dashboard(), stats.charts()])
  const s = d.data
  cards.value = [
    { label: '用户总数', value: s.userCount, icon: 'User', color: '#409eff' },
    { label: '商家总数', value: s.businessCount, icon: 'Shop', color: '#67c23a' },
    { label: '订单总数', value: s.orderCount, icon: 'Tickets', color: '#e6a23c' },
    { label: '今日订单', value: s.todayOrders, icon: 'Clock', color: '#f56c6c' },
    { label: '累计成交额', value: `¥${s.totalAmount}`, icon: 'Money', color: '#909399' },
    { label: '今日成交额', value: `¥${s.todayAmount}`, icon: 'Wallet', color: '#f56c6c' },
  ]
  initCharts(c.data)
  // 补充订单状态分布
  const all = await order.all()
  const statuses = {}
  ;(all.data || []).forEach((o) => {
    statuses[o.status] = (statuses[o.status] || 0) + 1
  })
  render(statusRef.value, {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 10, top: 'center' },
    series: [
      {
        name: '订单状态',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['58%', '50%'],
        data: Object.entries(statuses).map(([name, value]) => ({ name, value })),
      },
    ],
  })
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', resize)
})

function resize() {
  charts.forEach((c) => c.resize())
}

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  charts.forEach((c) => c.dispose())
})
</script>

<style scoped>
.dashboard {
  padding: 4px;
}
.mt {
  margin-top: 16px;
}
.card {
  display: flex;
  align-items: center;
  gap: 14px;
}
.card-icon {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.card-value {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}
.card-label {
  font-size: 13px;
  color: #909399;
}
.chart {
  height: 320px;
}
</style>