<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="骑手姓名" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="userId" label="用户ID" width="80" />
      <el-table-column prop="name" label="姓名" width="110" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="identification" label="身份证号" width="180" />
      <el-table-column prop="studentNumber" label="学号" width="130" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '通过' ? 'success' : 'warning'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="time" label="申请时间" width="170" />
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
import { deliveryman } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await deliveryman.list({ ...query, name: query.keyword })
    list.value = res.data.records || res.data || []
    total.value = res.data.total || list.value.length
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