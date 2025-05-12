<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="header">
          <h2>多模态试卷自动勘误辅导系统</h2>
        </div>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="80px"
      >
        <el-form-item label="角色" prop="role">
          <el-select
            v-model="loginForm.role"
            placeholder="请选择登录角色"
            style="width: 100%"
          >
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
          </el-select>
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
          />
        </el-form-item>

        <el-button
          type="primary"
          @click="handleLogin"
          :loading="loading"
          class="login-button"
        >
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";

const router = useRouter();
const userStore = useUserStore();
const loginFormRef = ref(null);
const loading = ref(false);

const loginForm = reactive({
  role: "admin",
  username: "",
  password: "",
});

const loginRules = {
  role: [{ required: true, message: "请选择登录角色", trigger: "change" }],
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

const handleLogin = async () => {
  if (!loginFormRef.value) return;

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        await userStore.login({
          role: loginForm.role,
          username: loginForm.username,
          password: loginForm.password,
        });
        router.push("/");
      } catch (error) {
        ElMessage.error(error.message || "登录失败");
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background-image: url("@/assets/风景.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.login-card {
  width: 400px;
  background-color: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(5px);
}

.header {
  text-align: center;
}

.header h2 {
  margin: 0;
  padding: 10px 0;
  color: #303133;
  font-size: 20px;
  font-weight: bold;
}

.login-button {
  width: 50%;
  margin: 20px auto 0;
  display: block;
}

:deep(.el-form-item__label) {
  color: #303133;
  font-weight: 500;
}

:deep(.el-input__inner) {
  background-color: rgba(255, 255, 255, 0.8);
}

:deep(.el-select) {
  width: 100%;
}
</style>
