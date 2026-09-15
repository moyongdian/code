<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="订单ID" clearable style="width: 200px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="orderId" label="订单ID" width="80" />
      <el-table-column prop="productName" label="商品" min-width="140" />
      <el-table-column prop="price" label="单价" width="90">
        <template #default="{ row }">¥{{ row.price?.toFixed?.(2) }}</template>
      </el-table-column>
      <el-table-column prop="num" label="数量" width="70" />
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="100"
      :current-page="1"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { orderItem } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ keyword: '' })

async function load() {
  loading.value = true
  try {
    const res = await orderItem.all()
    let data = res.data || []
    if (query.keyword) {
      const kw = query.keyword.trim()
      data = data.filter((i) => String(i.orderId).includes(kw) || (i.productName || '').includes(kw))
    }
    list.value = query.keyword ? data : data.slice(0, 100)
    total.value = query.keyword ? data.length : res.data.length || 0
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
</style>