<template>
  <div class="teacher-management">
    <el-card>
      <template #header>
        <div class="clearfix">
          <span>教师账号管理</span>
          <el-button
            style="float: right; padding: 3px 0"
            type="primary"
            text
            @click="showAddDialog"
            >添加教师</el-button
          >
        </div>
      </template>

      <!-- 搜索框 -->
      <div class="search-container" style="margin-bottom: 20px">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名/姓名/邮箱"
          clearable
          @clear="handleSearchClear"
          @input="handleSearch"
          style="width: 300px"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <!-- 教师列表 -->
      <el-table :data="teachers" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)"
              >编辑</el-button
            >
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(scope.row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加教师对话框 -->
    <el-dialog v-model="addDialogVisible" title="添加教师" width="40%">
      <el-form
        ref="teacherFormRef"
        :model="teacherForm"
        :rules="teacherRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="teacherForm.username" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="teacherForm.name" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="teacherForm.password" type="password" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="teacherForm.email" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取 消</el-button>
          <el-button
            type="primary"
            @click="submitTeacherForm"
            :loading="submitLoading"
            >确 定</el-button
          >
        </span>
      </template>
    </el-dialog>

    <!-- 编辑教师对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑教师" width="40%">
      <el-form
        ref="teacherFormRef"
        :model="teacherForm"
        :rules="teacherRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="teacherForm.username" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="teacherForm.name" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="teacherForm.password"
            type="password"
            placeholder="不修改请留空"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="teacherForm.email" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取 消</el-button>
          <el-button
            type="primary"
            @click="submitEditForm"
            :loading="submitLoading"
            >确 定</el-button
          >
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from "vue";
import { Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useTeacherStore } from "../stores/teacher";

const teacherStore = useTeacherStore();

// 响应式状态
const searchQuery = ref("");
const filteredTeachers = ref([]);
const loading = ref(false);
const submitLoading = ref(false);
const teachers = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const addDialogVisible = ref(false);
const editDialogVisible = ref(false);
const currentTeacherId = ref(null);
const teacherFormRef = ref(null);

const teacherForm = reactive({
  username: "",
  name: "",
  password: "",
  email: "",
});

// 表单验证规则
const validatePassword = (rule, value, callback) => {
  if (editDialogVisible.value && !value) {
    callback();
  } else if (!value) {
    callback(new Error("请输入密码"));
  } else if (value.length < 6) {
    callback(new Error("密码长度不能小于6位"));
  } else {
    callback();
  }
};

const teacherRules = reactive({
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 20, message: "长度在 3 到 20 个字符", trigger: "blur" },
  ],
  name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  password: [{ validator: validatePassword, trigger: "blur" }],
  email: [
    { required: true, message: "请输入邮箱地址", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱地址", trigger: "blur" },
  ],
});

// 搜索处理
const handleSearch = () => {
  const query = searchQuery.value.toLowerCase().trim();
  const allTeachers = teacherStore.teacherList;

  if (!query) {
    filteredTeachers.value = allTeachers;
  } else {
    filteredTeachers.value = allTeachers.filter(
      (teacher) =>
        teacher.username.toLowerCase().includes(query) ||
        teacher.name.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query)
    );
  }

  currentPage.value = 1;
  updateDisplayTeachers();
};

// 清空搜索
const handleSearchClear = () => {
  searchQuery.value = "";
  handleSearch();
};

// 更新显示的教师列表
const updateDisplayTeachers = () => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  teachers.value = filteredTeachers.value.slice(start, end);
  total.value = filteredTeachers.value.length;
};

// 获取教师列表
const getTeachers = async () => {
  loading.value = true;
  try {
    const teacherList = await teacherStore.getTeacherList();
    if (Array.isArray(teacherList)) {
      filteredTeachers.value = teacherList;
      updateDisplayTeachers();
    } else {
      console.error("获取到的教师列表不是数组:", teacherList);
      teachers.value = [];
      filteredTeachers.value = [];
      total.value = 0;
      ElMessage.error("教师数据格式错误");
    }
  } catch (error) {
    console.error("获取教师列表失败:", error);
    ElMessage.error("获取教师列表失败");
    teachers.value = [];
    filteredTeachers.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val;
  updateDisplayTeachers();
};

// 处理每页条数变化
const handleSizeChange = (val) => {
  pageSize.value = val;
  currentPage.value = 1;
  updateDisplayTeachers();
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(
    2,
    "0"
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// 显示添加对话框
const showAddDialog = () => {
  addDialogVisible.value = true;
  nextTick(() => {
    if (teacherFormRef.value) {
      teacherFormRef.value.resetFields();
      Object.assign(teacherForm, {
        username: "",
        name: "",
        password: "",
        email: "",
      });
    }
  });
};

// 处理编辑
const handleEdit = (row) => {
  currentTeacherId.value = row.id;
  editDialogVisible.value = true;
  nextTick(() => {
    if (teacherFormRef.value) {
      teacherFormRef.value.resetFields();
      Object.assign(teacherForm, {
        username: row.username,
        name: row.name,
        password: "", // 密码不回显
        email: row.email,
      });
    }
  });
};

// 处理删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除教师 ${row.name}?`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await teacherStore.deleteTeacher(row.id);
        ElMessage.success("删除成功");
        getTeachers();
      } catch (error) {
        ElMessage.error("删除教师失败");
      }
    })
    .catch(() => {
      ElMessage.info("已取消删除");
    });
};

// 提交添加表单
const submitTeacherForm = () => {
  if (!teacherFormRef.value) return;

  teacherFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        await teacherStore.addTeacher({
          username: teacherForm.username,
          name: teacherForm.name,
          password: teacherForm.password,
          email: teacherForm.email,
        });
        addDialogVisible.value = false;
        ElMessage.success("添加成功");
        getTeachers();
      } catch (error) {
        ElMessage.error("添加教师失败");
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

// 提交编辑表单
const submitEditForm = () => {
  if (!teacherFormRef.value) return;

  teacherFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        await teacherStore.updateTeacher({
          id: currentTeacherId.value,
          username: teacherForm.username,
          name: teacherForm.name,
          password: teacherForm.password,
          email: teacherForm.email,
        });
        editDialogVisible.value = false;
        ElMessage.success("更新成功");
        getTeachers();
      } catch (error) {
        ElMessage.error("更新教师失败");
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

// 生命周期钩子
onMounted(() => {
  getTeachers();
});
</script>

<style scoped>
.teacher-management {
  padding: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style>
