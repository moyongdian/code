<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="用户名/姓名/手机号" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
      <el-button type="success" @click="openDialog()">新增用户</el-button>
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
      <el-table-column prop="sex" label="性别" width="70">
        <template #default="{ row }">{{ row.sex === 1 ? '男' : row.sex === 2 ? '女' : '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="primary" plain @click="onResetPwd(row)">重置密码</el-button>
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑用户' : '新增用户'" width="520px">
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
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.sex">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
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
import { user } from '@/api'

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

function buildParams() {
  return query.keyword ? { ...query, username: query.keyword } : { ...query }
}

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await user.list(buildParams())
    list.value = res.data.records || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) Object.assign(form, { ...row, password: '' })
  else Object.assign(form, { role: '用户', sex: 1 })
  dialogVisible.value = true
}

async function onSave() {
  await formRef.value.validate()
  if (form.id) {
    await user.update(form)
  } else {
    await user.add(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function onResetPwd(row) {
  const { value } = await ElMessageBox.prompt('请输入新的登录密码', `重置「${row.username}」的密码`, {
    inputType: 'password',
    inputPattern: /^\S{6,20}$/,
    inputErrorMessage: '密码长度 6-20 位',
  })
  await user.resetPwd({ id: row.id, password: value })
  ElMessage.success('密码已重置')
}

async function onBatchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selected.value.length} 个用户？`, '提示', { type: 'warning' })
  await user.batchRemove(selected.value.map((i) => i.id))
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