import { defineStore } from "pinia";
import Cookies from "js-cookie";
import { useTeacherStore } from "./teacher";

export const useUserStore = defineStore("user", {
  state: () => ({
    token: Cookies.get("token"),
    userInfo: null,
    roles: [],
  }),

  actions: {
    setToken(token) {
      this.token = token;
      if (token) {
        Cookies.set("token", token);
      } else {
        Cookies.remove("token");
      }
    },

    setUserInfo(userInfo) {
      this.userInfo = userInfo;
    },

    setRoles(roles) {
      this.roles = roles;
    },

    clearUser() {
      this.token = null;
      this.userInfo = null;
      this.roles = [];
      Cookies.remove("token");
    },

    // 用户登录
    async login(userInfo) {
      const { role, username, password } = userInfo;

      return new Promise((resolve, reject) => {
        // 模拟API请求
        setTimeout(async () => {
          try {
            if (role === "admin") {
              // 管理员登录验证
              if (username === "admin" && password === "123456") {
                const token = "admin-token";
                this.setToken(token);
                this.setRoles(["admin"]);
                this.setUserInfo({
                  id: 1,
                  username: "admin",
                  name: "管理员",
                });
                resolve();
              } else {
                reject(new Error("管理员账号或密码错误"));
              }
            } else if (role === "teacher") {
              try {
                const teacherStore = useTeacherStore();
                const teacher = await teacherStore.validateTeacher({
                  username,
                  password,
                });

                if (teacher) {
                  const token = "teacher-token";
                  this.setToken(token);
                  this.setRoles(["teacher"]);
                  this.setUserInfo({
                    id: teacher.id,
                    username: teacher.username,
                    name: teacher.name,
                  });
                  resolve();
                } else {
                  reject(new Error("教师账号或密码错误"));
                }
              } catch (error) {
                reject(new Error(error.message || "教师登录失败"));
              }
            } else {
              reject(new Error("无效的登录角色"));
            }
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    },

    // 获取用户信息
    async getUserInfo() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (this.token === "admin-token") {
            this.setRoles(["admin"]);
            this.setUserInfo({
              id: 1,
              username: "admin",
              name: "管理员",
            });
            resolve({ roles: ["admin"] });
          } else if (this.token) {
            this.setRoles(["teacher"]);
            this.setUserInfo({
              id: 2,
              username: "teacher",
              name: "教师",
            });
            resolve({ roles: ["teacher"] });
          } else {
            reject(new Error("获取用户信息失败"));
          }
        }, 300);
      });
    },

    // 退出登录
    async logout() {
      this.clearUser();
    },
  },
});
