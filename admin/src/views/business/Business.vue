<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="商家名称" clearable style="width: 220px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-button type="primary" @click="load(1)">查询</el-button>
      <el-button type="success" @click="openDialog()">新增商家</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="商家名称" min-width="120" />
      <el-table-column prop="phone" label="电话" width="120" />
      <el-table-column prop="status" label="审核状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === '通过' ? 'success' : row.status === '拒绝' ? 'danger' : 'warning'" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="openStatus" label="营业状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.openStatus === 1 ? 'success' : 'info'" size="small">
            {{ row.openStatus === 1 ? '营业中' : '已打烊' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="score" label="评分" width="70" />
      <el-table-column prop="minAmount" label="起送价" width="90" />
      <el-table-column prop="openTime" label="营业时间" width="120" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button v-if="row.status !== '通过'" size="small" type="success" plain @click="onAudit(row, '通过')">通过</el-button>
          <el-button v-if="row.status !== '拒绝'" size="small" type="danger" plain @click="onAudit(row, '拒绝')">拒绝</el-button>
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑商家' : '新增商家'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="商家名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.introduce" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="起送价">
          <el-input-number v-model="form.minAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="营业时间">
          <el-col :span="11">
            <el-time-picker v-model="openTimeVal" format="HH:mm" value-format="HH:mm" placeholder="开始时间" style="width:100%" />
          </el-col>
          <el-col :span="2" style="text-align:center">~</el-col>
          <el-col :span="11">
            <el-time-picker v-model="closeTimeVal" format="HH:mm" value-format="HH:mm" placeholder="结束时间" style="width:100%" />
          </el-col>
        </el-form-item>
        <el-form-item label="评分">
          <el-rate v-model="form.score" :max="5" allow-half show-score />
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
import { business } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({})
const openTimeVal = ref('')
const closeTimeVal = ref('')
const rules = {
  name: [{ required: true, message: '请输入商家名称', trigger: 'blur' }],
}

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const res = await business.list({ ...query, name: query.keyword })
    list.value = res.data.records || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) {
    Object.assign(form, { ...row })
    openTimeVal.value = row.openTime || ''
    closeTimeVal.value = row.closeTime || ''
  } else {
    Object.assign(form, { openStatus: 1, minAmount: 10, score: 5 })
    openTimeVal.value = '10:00'
    closeTimeVal.value = '22:00'
  }
  dialogVisible.value = true
}

async function onSave() {
  await formRef.value.validate()
  form.openTime = openTimeVal.value
  form.closeTime = closeTimeVal.value
  if (form.id) {
    await business.update(form)
  } else {
    await business.add(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function onAudit(row, status) {
  await ElMessageBox.confirm(`确认将「${row.name}」审核为「${status}」？`, '审核')
  await business.update({ id: row.id, status })
  ElMessage.success('操作成功')
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