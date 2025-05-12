/**
 * 教师管理API
 */

import axios from "axios";

// 创建axios实例
const request = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "/api"
      : "http://localhost:3000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

export const teacherApi = {
  // 获取所有教师
  getTeachers: () => {
    return request.get("/teachers");
  },

  // 获取单个教师
  getTeacher: (id) => {
    return request.get(`/teachers/${id}`);
  },

  // 创建教师
  createTeacher: (teacherData) => {
    return request.post("/teachers", teacherData);
  },

  // 更新教师
  updateTeacher: (id, teacherData) => {
    return request.put(`/teachers/${id}`, teacherData);
  },

  // 删除教师
  deleteTeacher: (id) => {
    return request.delete(`/teachers/${id}`);
  },
};
