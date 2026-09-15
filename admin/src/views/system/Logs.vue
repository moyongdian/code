<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.operation" placeholder="操作模块" clearable style="width: 150px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-input v-model="query.type" placeholder="操作类型" clearable style="width: 130px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-input v-model="query.user" placeholder="操作人" clearable style="width: 130px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
      <el-button :disabled="!selected.length" @click="onBatchRemove">批量删除</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe @selection-change="(v) => (selected = v)">
      <el-table-column type="selection" width="45" />
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="operation" label="操作模块" width="120" />
      <el-table-column prop="type" label="操作类型" width="110" />
      <el-table-column prop="user" label="操作人" width="120" />
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column prop="time" label="操作时间" width="180" />
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
import { logs } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const selected = ref([])
const query = reactive({ operation: '', type: '', user: '', pageNum: 1, pageSize: 10 })

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await logs.list(query)
    list.value = res.data.records || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

async function onRemove(row) {
  await ElMessageBox.confirm('确认删除该日志？', '提示', { type: 'warning' })
  await logs.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

async function onBatchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selected.value.length} 条日志？`, '提示', { type: 'warning' })
  await logs.batchRemove(selected.value.map((i) => i.id))
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
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
</style>