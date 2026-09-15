<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="收货人/地址关键字" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="user" label="收货人" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="address" label="地址" />
      <el-table-column prop="userId" label="所属用户ID" width="100" />
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="query.pageSize"
      :current-page="query.pageNum"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { address } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await address.list({ ...query, address: query.keyword })
    list.value = res.data.records || []
    total.value = res.data.total || 0
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