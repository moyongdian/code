<template>
  <el-card>
    <div class="toolbar">
      <el-button type="success" @click="openDialog()">新增轮播图</el-button>
      <el-button :disabled="!selected.length" @click="onBatchRemove">批量删除</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe @selection-change="(v) => (selected = v)">
      <el-table-column type="selection" width="45" />
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="图片" width="140">
        <template #default="{ row }">
          <el-image :src="row.img" fit="cover" style="width: 100px; height: 50px; border-radius: 4px" />
        </template>
      </el-table-column>
      <el-table-column prop="time" label="创建时间" width="170" />
      <el-table-column prop="open" label="展示" width="80">
        <template #default="{ row }">
          <el-tag :type="row.open ? 'success' : 'info'" size="small">{{ row.open ? '展示' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" plain @click="onRemove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑轮播图' : '新增轮播图'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="图片" prop="img">
          <el-upload :action="fileApi.uploadUrl" :show-file-list="false" :on-success="onUploadSuccess" accept="image/*">
            <el-button size="small">上传图片</el-button>
            <el-image v-if="form.img" :src="form.img" fit="cover" class="preview-img" />
          </el-upload>
        </el-form-item>
        <el-form-item label="是否展示">
          <el-switch v-model="form.open" :active-value="true" :inactive-value="false" />
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
import { banner, fileApi } from '@/api'

const list = ref([])
const loading = ref(false)
const selected = ref([])
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({})
const rules = {
  img: [{ required: true, message: '请上传图片', trigger: 'change' }],
}

async function load() {
  loading.value = true
  try {
    const res = await banner.all()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) Object.assign(form, { ...row })
  else Object.assign(form, { open: true })
  dialogVisible.value = true
}

function onUploadSuccess(res) {
  if (res && res.code === 200) {
    form.img = res.data
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(res?.msg || '上传失败')
  }
}

async function onSave() {
  await formRef.value.validate()
  if (form.id) {
    await banner.update(form)
  } else {
    await banner.add(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除该轮播图？`, '提示', { type: 'warning' })
  await banner.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

async function onBatchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selected.value.length} 条轮播图？`, '提示', { type: 'warning' })
  for (const item of selected.value) {
    await banner.remove(item.id)
  }
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
.preview-img {
  width: 80px;
  height: 50px;
  margin-left: 12px;
  border-radius: 4px;
  vertical-align: middle;
}
</style>