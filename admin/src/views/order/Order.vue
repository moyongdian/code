<template>
  <el-card>
    <div class="toolbar">
      <el-select v-model="query.status" placeholder="订单状态" clearable style="width: 140px" @change="load">
        <el-option label="待支付" value="待支付" />
        <el-option label="待发货" value="待发货" />
        <el-option label="待收货" value="待收货" />
        <el-option label="已完成" value="已完成" />
        <el-option label="已退款" value="已退款" />
      </el-select>
      <el-input v-model="query.keyword" placeholder="订单号/用户名" clearable style="width: 200px" @keyup.enter="load" @clear="load" />
      <el-button type="primary" @click="load">查询</el-button>
      <el-button :disabled="!selected.length" @click="onBatchRemove">批量删除</el-button>
    </div>

    <el-table :data="filteredList" v-loading="loading" border stripe @selection-change="(v) => (selected = v)">
      <el-table-column type="selection" width="45" />
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="orderNo" label="订单号" width="160" />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="user" label="收货人" width="90" />
      <el-table-column prop="phone" label="电话" width="120" />
      <el-table-column label="商家" width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.business?.name || '—' }}</template>
      </el-table-column>
      <el-table-column prop="amount" label="原价" width="80">
        <template #default="{ row }">¥{{ row.amount?.toFixed?.(2) ?? row.amount }}</template>
      </el-table-column>
      <el-table-column prop="actual" label="实付" width="80">
        <template #default="{ row }">¥{{ row.actual?.toFixed?.(2) ?? row.actual }}</template>
      </el-table-column>
      <el-table-column prop="payTime" label="支付时间" width="160" />
      <el-table-column prop="time" label="下单时间" width="160" />
      <el-table-column prop="commentStatus" label="评价" width="70">
        <template #default="{ row }">
          <el-tag :type="row.commentStatus === 1 ? 'success' : 'info'" size="small">
            {{ row.commentStatus === 1 ? '已评' : '未评' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onViewItems(row)">明细</el-button>
          <el-button size="small" type="primary" plain @click="onPay(row)" v-if="row.status === '待支付'">标记支付</el-button>
          <el-button size="small" type="danger" plain @click="onRemove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 订单明细弹窗 -->
    <el-dialog v-model="itemsVisible" title="订单明细" width="720px">
      <el-table :data="items" border stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="productName" label="商品" />
        <el-table-column prop="price" label="单价" width="90">
          <template #default="{ row }">¥{{ row.price?.toFixed?.(2) }}</template>
        </el-table-column>
        <el-table-column prop="num" label="数量" width="70" />
        <el-table-column prop="total" label="小计" width="100">
          <template #default="{ row }">¥{{ (row.price * row.num).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { order, orderItem } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const selected = ref([])
const query = reactive({ status: '', keyword: '', pageNum: 1, pageSize: 200 })
const itemsVisible = ref(false)
const items = ref([])

const filteredList = computed(() => {
  let res = list.value
  if (query.status) res = res.filter((o) => o.status === query.status)
  if (query.keyword) {
    const kw = query.keyword.toLowerCase()
    res = res.filter((o) => (o.orderNo || '').toLowerCase().includes(kw) || (o.user || '').toLowerCase().includes(kw))
  }
  return res
})

function statusType(s) {
  const m = { '待支付': 'warning', '待发货': '', '待收货': 'primary', '已完成': 'success', '已退款': 'danger' }
  return m[s] || 'info'
}

async function load() {
  loading.value = true
  try {
    const res = await order.all()
    list.value = res.data || []
    total.value = list.value.length
  } finally {
    loading.value = false
  }
}

async function onViewItems(row) {
  const res = await orderItem.byOrder(row.id)
  items.value = res.data || []
  itemsVisible.value = true
}

async function onPay(row) {
  await ElMessageBox.confirm(`确认将订单「${row.orderNo}」标记为已支付？`, '操作确认')
  await order.update({ id: row.id, status: '待发货', payTime: new Date().toLocaleString() })
  ElMessage.success('操作成功')
  load()
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除订单「${row.orderNo}」？`, '提示', { type: 'warning' })
  await order.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

async function onBatchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selected.value.length} 个订单？`, '提示', { type: 'warning' })
  await order.batchRemove(selected.value.map((i) => i.id))
  ElMessage.success('删除成功')
  load()
}

onMounted(() => load())
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
</style>