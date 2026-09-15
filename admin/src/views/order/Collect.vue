<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="商家名称" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="uid" label="用户ID" width="80" />
      <el-table-column prop="bid" label="商家ID" width="80" />
      <el-table-column prop="businessName" label="商家名称" min-width="140" />
      <el-table-column prop="time" label="收藏时间" width="170" />
      <el-table-column prop="isCollect" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isCollect === 1 ? 'success' : 'info'" size="small">
            {{ row.isCollect === 1 ? '已收藏' : '已取消' }}
          </el-tag>
        </template>
      </el-table-column>
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
import { collect } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await collect.list({ ...query, businessName: query.keyword })
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