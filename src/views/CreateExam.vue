<template>
  <div class="create-exam-container">
    <h1 class="page-title">创建新考试</h1>

    <el-card class="create-exam-card">
      <el-form
        :model="examForm"
        :rules="rules"
        ref="examFormRef"
        label-width="80px"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="examForm.title"
            placeholder="请输入考试标题"
          ></el-input>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            type="textarea"
            v-model="examForm.description"
            placeholder="请输入考试描述"
            :rows="4"
          ></el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading"
            >创建考试</el-button
          >
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../stores/user";
import { examApi } from "../api/exam";
import { ElMessage } from "element-plus";

const router = useRouter();
const userStore = useUserStore();

const examFormRef = ref(null);
const loading = ref(false);

const examForm = reactive({
  title: "",
  description: "",
});

const rules = {
  title: [
    { required: true, message: "请输入考试标题", trigger: "blur" },
    { min: 2, max: 100, message: "长度在 2 到 100 个字符", trigger: "blur" },
  ],
  description: [
    { max: 500, message: "长度不能超过 500 个字符", trigger: "blur" },
  ],
};
const submitForm = async () => {
  if (!examFormRef.value) return;

  const valid = await examFormRef.value.validate();
  if (valid) {
    loading.value = true;

    const teacherId = userStore.userInfo?.id;

    if (!teacherId) {
      ElMessage.error("获取用户信息失败，请重新登录");
      loading.value = false;
      return;
    }
    // 创建考试数据对象
    const examData = {
      title: examForm.title,
      description: examForm.description,
      teacher_id: teacherId,
    };

    try {
      // 调用API创建考试
      const response = await examApi.createExam(examData);
      if (response.data.success) {
        ElMessage.success("考试创建成功！");
        // 跳转到答案定义页面，并传递考试ID
        const examId = response.data.data.id;
        router.push(`/exam/${examId}/define-answers`);
      } else {
        ElMessage.error(response.data.message || "创建失败，请重试");
      }
    } catch (error) {
      console.error("创建考试失败:", error);
      ElMessage.error("创建失败，请重试");
    } finally {
      loading.value = false;
    }
  }
};

const resetForm = () => {
  examFormRef.value?.resetFields();
};
</script>

<style scoped>
.create-exam-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  text-align: center;
  margin-bottom: 30px;
  color: #409eff;
}

.create-exam-card {
  margin-bottom: 20px;
}
</style>
