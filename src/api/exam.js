import axios from "axios";
import { ElMessage } from "element-plus";

// 创建 axios 实例
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
  (response) => {
    return response;
  },
  (error) => {
    ElMessage.error(error.response?.data?.message || "请求失败");
    return Promise.reject(error);
  }
);

export const examApi = {
  // 创建考试
  createExam: (examData) => {
    return request.post("/exams", examData);
  },

  // 获取考试详情
  getExamById: (id) => {
    return request.get(`/exams/${id}`);
  },

  // 获取教师的所有考试
  getExamsByTeacherId: (teacherId) => {
    return request.get(`/exams/teacher/${teacherId}`);
  },

  // 保存题目答案
  saveAnswers: (examId, sections) => {
    return request.post(`/exams/${examId}/answers`, { examId, sections });
  },

  // 获取考试答案
  getAnswers: (examId) => {
    return request.get(`/exams/${examId}/answers`);
  },

  // 删除考试
  deleteExam: (examId) => {
    return request.delete(`/exams/${examId}`);
  },
};
