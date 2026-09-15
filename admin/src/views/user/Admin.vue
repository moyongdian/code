<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="用户名/姓名" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
      <el-button type="success" @click="openDialog()">新增管理员</el-button>
      <el-button :disabled="!selected.length" @click="onBatchRemove">批量删除</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe @selection-change="(v) => (selected = v)">
      <el-table-column type="selection" width="45" />
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" width="90" />
      <el-table-column label="操作" width="220" fixed="right">
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑管理员' : '新增管理员'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" :type="form.id ? 'password' : 'text'" :placeholder="form.id ? '留空则不修改' : '请输入密码'" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
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
import { admin } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const selected = ref([])
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({})
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
}

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await admin.list({ ...query, username: query.keyword, name: query.keyword })
    list.value = res.data.records || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) Object.assign(form, { ...row, password: '' })
  else Object.assign(form, { role: '管理员' })
  dialogVisible.value = true
}

async function onSave() {
  await formRef.value.validate()
  if (form.id) {
    await admin.update(form)
  } else {
    await admin.add(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除管理员「${row.username}」？`, '提示', { type: 'warning' })
  await admin.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

async function onBatchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selected.value.length} 个管理员？`, '提示', { type: 'warning' })
  await admin.batchRemove(selected.value.map((i) => i.id))
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