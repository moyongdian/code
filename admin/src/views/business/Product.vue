<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="商品名称" clearable style="width: 200px" @keyup.enter="load(1)" @clear="load(1)" />
      <el-select v-model="query.bid" placeholder="按商家筛选" clearable style="width: 180px" @change="load(1)">
        <el-option v-for="b in bizList" :key="b.id" :label="b.name" :value="b.id" />
      </el-select>
      <el-button type="primary" @click="load(1)">查询</el-button>
      <el-button type="success" @click="openDialog()">新增商品</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="商品名称" min-width="120" />
      <el-table-column prop="price" label="原价" width="80" />
      <el-table-column prop="realPrice" label="折后价" width="80">
        <template #default="{ row }">¥{{ (row.realPrice ?? (row.price * 0.7).toFixed(2)) }}</template>
      </el-table-column>
      <el-table-column prop="sum" label="库存" width="70" />
      <el-table-column prop="business" label="商家" width="140" />
      <el-table-column prop="category" label="分类" width="90" />
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑商品' : '新增商品'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="商家" prop="bid">
          <el-select v-model="form.bid" style="width: 100%" @change="syncBiz">
            <el-option v-for="b in bizList" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" prop="cid">
          <el-select v-model="form.cid" style="width: 100%">
            <el-option v-for="ct in catList" :key="ct.id" :label="ct.name" :value="ct.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="form.sum" :min="0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload :action="fileApi.uploadUrl" :show-file-list="false" :on-success="onUploadSuccess" accept="image/*">
            <el-button size="small">上传图片</el-button>
            <el-image v-if="form.picture" :src="form.picture" fit="cover" class="preview-img" />
          </el-upload>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { product, business, category, fileApi } from '@/api'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const bizList = ref([])
const catList = ref([])
const query = reactive({ keyword: '', bid: '', pageNum: 1, pageSize: 10 })
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({})
const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  bid: [{ required: true, message: '请选择商家', trigger: 'change' }],
  cid: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

async function load(page = query.pageNum) {
  query.pageNum = page
  loading.value = true
  try {
    const params = { pageNum: query.pageNum, pageSize: query.pageSize }
    if (query.keyword) params.name = query.keyword
    if (query.bid) params.bid = query.bid
    const res = await product.list(params)
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

async function loadCat(bid) {
  if (!bid) return
  const res = await category.byBid(bid)
  catList.value = res.data || []
}

function syncBiz(bid) {
  form.business = (bizList.value.find((b) => b.id === bid) || {}).name
  form.bid = bid
  form.cid = undefined
  catList.value = []
}

watch(() => form.bid, (v) => v && loadCat(v))

function openDialog(row) {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) {
    Object.assign(form, { ...row })
    if (row.bid) loadCat(row.bid)
  } else {
    Object.assign(form, { price: 0, sum: 0, business: bizList.value[0]?.name })
    if (bizList.value[0]) form.bid = bizList.value[0].id
  }
  dialogVisible.value = true
}

function onUploadSuccess(res) {
  if (res && res.code === 200) {
    form.picture = res.data
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(res?.msg || '上传失败')
  }
}

async function onSave() {
  await formRef.value.validate()
  if (form.id) {
    await product.update(form)
  } else {
    await product.add(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除商品「${row.name}」？`, '提示', { type: 'warning' })
  await product.remove(row.id)
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
  flex-wrap: wrap;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
.preview-img {
  width: 60px;
  height: 60px;
  margin-left: 12px;
  border-radius: 4px;
  vertical-align: middle;
}
</style>