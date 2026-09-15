<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="评论内容关键字" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
      <el-button :disabled="!selected.length" @click="onBatchRemove">批量删除</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe @selection-change="(v) => (selected = v)">
      <el-table-column type="selection" width="45" />
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户" width="120" />
      <el-table-column prop="business" label="商家" width="130" />
      <el-table-column prop="contents" label="评论内容" min-width="200" show-overflow-tooltip />
      <el-table-column prop="pid" label="商品ID" width="80" />
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="danger" plain @click="onRemove(row)">删除</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { comment } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const selected = ref([])
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await comment.list({ ...query, contents: query.keyword })
    list.value = res.data.records || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除该评论？`, '提示', { type: 'warning' })
  await comment.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

async function onBatchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selected.value.length} 条评论？`, '提示', { type: 'warning' })
  await comment.batchRemove(selected.value.map((i) => i.id))
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
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
</style>