<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="分类名称" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
      <el-button type="success" @click="openDialog()">新增分类</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="分类名称" />
      <el-table-column prop="bid" label="商家ID" width="90" />
      <el-table-column prop="bname" label="所属商家" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑分类' : '新增分类'" width="460px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" placeholder="如：主食、饮品" />
        </el-form-item>
        <el-form-item label="所属商家">
          <el-select v-model="form.bid" style="width: 100%" @change="syncBName">
            <el-option v-for="b in bizList" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { category, business } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const bizList = ref([])
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })
const dialogVisible = ref(false)
const form = reactive({})

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await category.list({ ...query, name: query.keyword })
    list.value = res.data.records || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

async function loadBiz() {
  const res = await business.all()
  bizList.value = res.data || []
}

function openDialog(row) {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) Object.assign(form, { ...row })
  dialogVisible.value = true
}

function syncBName(bid) {
  const b = bizList.value.find((x) => x.id === bid)
  form.bname = b ? b.name : ''
}

async function onSave() {
  if (!form.name) {
    ElMessage.warning('请输入分类名称')
    return
  }
  if (form.id) {
    await category.update(form)
  } else {
    await category.add(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除分类「${row.name}」？`, '提示', { type: 'warning' })
  await category.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(() => {
  load()
  loadBiz()
})
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