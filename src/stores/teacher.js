import { defineStore } from "pinia";
import { teacherApi } from "@/api/teacher";
import axios from "axios";

// API基础URL
const API_BASE_URL =
  process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3000/api";

export const useTeacherStore = defineStore("teachers", {
  state: () => ({
    teacherList: [],
  }),

  actions: {
    // 获取教师列表
    async getTeacherList() {
      try {
        const response = await teacherApi.getTeachers();
        // 确保response.data.data存在且是数组
        const teachers =
          response && response.data && Array.isArray(response.data)
            ? response.data
            : [];
        this.teacherList = teachers;
        return teachers;
      } catch (error) {
        console.error("获取教师列表失败:", error);
        this.teacherList = [];
        throw error;
      }
    },

    // 添加教师
    async addTeacher(teacherData) {
      try {
        const response = await teacherApi.createTeacher(teacherData);
        const newTeacher = response.data.data;
        this.teacherList.unshift(newTeacher);
        return newTeacher;
      } catch (error) {
        console.error("添加教师失败:", error);
        throw error;
      }
    },

    // 更新教师信息
    async updateTeacher(teacherData) {
      try {
        const response = await teacherApi.updateTeacher(
          teacherData.id,
          teacherData
        );
        const updatedTeacher = response.data;
        const index = this.teacherList.findIndex(
          (t) => t.id === updatedTeacher.id
        );
        if (index !== -1) {
          this.teacherList.splice(index, 1, updatedTeacher);
        }
        return updatedTeacher;
      } catch (error) {
        console.error("更新教师失败:", error);
        throw error;
      }
    },

    // 删除教师
    async deleteTeacher(teacherId) {
      try {
        await teacherApi.deleteTeacher(teacherId);
        this.teacherList = this.teacherList.filter((t) => t.id !== teacherId);
        return true;
      } catch (error) {
        console.error("删除教师失败:", error);
        throw error;
      }
    },

    // 验证教师账号
    async validateTeacher({ username, password }) {
      try {
        const loginData = { username, password };
        const response = await axios.post(
          `${API_BASE_URL}/teachers/login`,
          loginData
        );

        if (response.data && response.data.success) {
          return response.data.data;
        } else {
          throw new Error("教师账号或密码错误");
        }
      } catch (error) {
        console.error("教师验证失败:", error);
        throw error;
      }
    },
  },
});
