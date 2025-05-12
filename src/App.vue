<template>
  <div id="app">
    <el-container v-if="isLoggedIn">
      <el-header>
        <div class="header-container">
          <div class="logo">
            <span>多模态试卷自动勘误辅导系统</span>
          </div>
          <div class="user-info">
            <span v-if="userInfo">{{ userInfo.name }}</span>
            <el-dropdown @command="handleCommand">
              <span class="el-dropdown-link">
                <el-icon><Setting /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>
      <el-container>
        <el-aside width="200px">
          <el-menu
            :default-active="activeMenu"
            class="el-menu-vertical"
            router
            background-color="#545c64"
            text-color="#fff"
            active-text-color="#ffd04b"
          >
            <el-menu-item index="/">
              <template #title>
                <el-icon><HomeFilled /></el-icon>
                <span>考试列表</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/teacher-management" v-if="isAdmin">
              <template #title>
                <el-icon><User /></el-icon>
                <span>教师管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/create-exam">
              <template #title>
                <el-icon><EditPen /></el-icon>
                <span>创建考试</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/ai-analysis">
              <template #title>
                <el-icon><DataLine /></el-icon>
                <span>AI错题分析</span>
              </template>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <el-main>
          <router-view></router-view>
        </el-main>
      </el-container>
    </el-container>
    <router-view v-else></router-view>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";
import {
  Setting,
  HomeFilled,
  User,
  EditPen,
  DataLine,
} from "@element-plus/icons-vue";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const userInfo = computed(() => userStore.userInfo);
const roles = computed(() => userStore.roles);
const isLoggedIn = computed(() => route.path !== "/login");
const isAdmin = computed(() => roles.value.includes("admin"));
const activeMenu = computed(() => route.path);

const handleCommand = async (command) => {
  if (command === "logout") {
    await userStore.logout();
    router.push("/login");
    ElMessage.success("已退出登录");
  }
};
</script>

<style>
/* 全局样式 */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}

.el-header {
  background-color: #409eff;
  color: #fff;
  line-height: 60px;
  padding: 0 20px;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
}

.logo span {
  margin-left: 10px;
  font-size: 18px;
  font-weight: bold;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 15px;
}

.el-dropdown-link {
  cursor: pointer;
  color: #fff;
}

.el-container {
  height: 100%;
}

.el-aside {
  background-color: #545c64;
  color: #fff;
}

.el-menu-vertical {
  height: 100%;
  border-right: none;
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>
