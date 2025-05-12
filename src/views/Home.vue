<template>
  <div class="exam-list-container">
    <h1 class="system-title">多模态试卷自动勘误辅导系统</h1>

    <div class="exam-list-section">
      <h2>考试记录</h2>

      <!-- 考试列表 -->
      <div class="exam-cards">
        <el-card
          v-for="exam in exams"
          :key="exam.id"
          class="exam-card"
          shadow="hover"
          @click="viewExamContent(exam.id)"
        >
          <div class="exam-card-content">
            <div class="exam-id">考试ID: {{ exam.id }}</div>
            <div class="exam-title">{{ exam.title }}</div>
            <div class="exam-description" v-if="exam.description">
              {{ exam.description }}
            </div>
            <div class="exam-date">
              创建时间: {{ formatDate(exam.created_at) }}
            </div>
            <div class="exam-actions">
              <el-button
                type="danger"
                size="small"
                circle
                @click.stop="confirmDeleteExam(exam.id)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 空状态提示 -->
      <div class="empty-state" v-if="exams.length === 0 && !loading">
        <el-empty description="暂无考试记录"></el-empty>
        <el-button type="primary" @click="createNewExam" class="create-exam-btn"
          >创建新考试</el-button
        >
      </div>

      <!-- 加载状态 -->
      <div class="loading-state" v-if="loading">
        <el-skeleton :rows="3" animated />
        <el-skeleton :rows="3" animated />
      </div>

      <!-- 创建新考试按钮 -->
      <div class="create-exam-container" v-if="exams.length > 0 && !loading">
        <el-button type="primary" @click="createNewExam" class="create-exam-btn"
          >创建新考试</el-button
        >
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { examApi } from "@/api/exam";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete } from "@element-plus/icons-vue";

const router = useRouter();
const userStore = useUserStore();

const exams = ref([]);
const loading = ref(true);
const error = ref(null);

// 获取考试列表
const fetchExams = async () => {
  loading.value = true;
  try {
    const teacherId = userStore.userInfo?.id || 1;
    const response = await examApi.getExamsByTeacherId(teacherId);
    if (response.data.success) {
      exams.value = response.data.data;
    } else {
      error.value = response.data.message || "获取考试列表失败";
      ElMessage.error(error.value);
    }
  } catch (err) {
    console.error("获取考试列表失败:", err);
    error.value = "获取考试列表失败，请重试";
    ElMessage.error(error.value);
  } finally {
    loading.value = false;
  }
};

// 查看考试内容
const viewExamContent = (examId) => {
  router.push(`/exam/${examId}/content`);
};

// 创建新考试
const createNewExam = () => {
  router.push("/create-exam");
};

// 确认删除考试
const confirmDeleteExam = async (examId) => {
  try {
    await ElMessageBox.confirm(
      "此操作将永久删除该考试及其所有答案记录, 是否继续?",
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    await deleteExam(examId);
  } catch (err) {
    if (err !== "cancel") {
      console.error("删除考试失败:", err);
    }
  }
};

// 删除考试
const deleteExam = async (examId) => {
  try {
    const response = await examApi.deleteExam(examId);
    if (response.data.success) {
      ElMessage.success("删除成功!");
      await fetchExams();
    } else {
      ElMessage.error(response.data.message || "删除失败");
    }
  } catch (err) {
    console.error("删除考试失败:", err);
    ElMessage.error("删除考试失败，请重试");
  }
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

// 页面创建时加载考试列表
onMounted(() => {
  fetchExams();
});
</script>

<style scoped>
.exam-list-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.system-title {
  text-align: center;
  color: white;
  background-color: #409eff;
  padding: 15px;
  margin-top: 0;
  border-radius: 4px;
}

.exam-list-section {
  margin-top: 20px;
}

.exam-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.exam-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
}

.exam-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.exam-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.exam-id {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.exam-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 10px;
}

.exam-description {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
  flex-grow: 1;
}

.exam-date {
  font-size: 12px;
  color: #909399;
  text-align: right;
}

.exam-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.3s;
}

.exam-card:hover .exam-actions {
  opacity: 1;
}

.empty-state {
  margin-top: 40px;
  text-align: center;
}

.loading-state {
  margin-top: 20px;
}

.create-exam-container {
  margin-top: 30px;
  text-align: center;
}

.create-exam-btn {
  padding: 10px 20px;
}
</style>
