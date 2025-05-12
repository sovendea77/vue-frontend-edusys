import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";

// 使用动态导入来实现路由懒加载
const Home = () => import("../views/Home.vue");
const Login = () => import("../views/Login.vue");
const TeacherManagement = () => import("../views/TeacherManagement.vue");
const CreateExam = () => import("../views/CreateExam.vue");
const DefineAnswers = () => import("../views/DefineAnswers.vue");
const ExamContent = () => import("../views/ExamContent.vue");
const StudentWrongAnswers = () => import("../views/StudentWrongAnswers.vue");
const AIAnalysis = () => import("../views/AIAnalysis.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: Login,
      meta: { title: "登录" },
    },
    {
      path: "/",
      name: "Home",
      component: Home,
      meta: { title: "首页", requiresAuth: true },
    },
    {
      path: "/teacher-management",
      name: "TeacherManagement",
      component: TeacherManagement,
      meta: { title: "教师管理", requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/create-exam",
      name: "CreateExam",
      component: CreateExam,
      meta: { title: "创建考试", requiresAuth: true },
    },
    {
      path: "/exam/:examId/define-answers",
      name: "DefineAnswers",
      component: DefineAnswers,
      meta: { title: "定义答案", requiresAuth: true },
    },
    {
      path: "/exam/:examId/content",
      name: "ExamContent",
      component: ExamContent,
      meta: { title: "考试内容", requiresAuth: true },
    },
    {
      path: "/student-wrong-answers/:examId/:studentId/:studentName",
      name: "StudentWrongAnswers",
      component: StudentWrongAnswers,
      meta: { title: "学生错题详情", requiresAuth: true },
    },
    {
      path: "/ai-analysis",
      name: "AIAnalysis",
      component: AIAnalysis,
      meta: { title: "AI错题分析", requiresAuth: true },
    },
  ],
});

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  document.title = to.meta.title
    ? `${to.meta.title} - 教育管理系统`
    : "教育管理系统";

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!userStore.token) {
      next({
        path: "/login",
        query: { redirect: to.fullPath },
      });
      return;
    }

    if (!userStore.userInfo) {
      try {
        const { roles } = await userStore.getUserInfo();

        if (
          to.matched.some((record) => record.meta.requiresAdmin) &&
          !roles.includes("admin")
        ) {
          next({ path: "/" });
          return;
        }

        next();
      } catch (error) {
        userStore.clearUser();
        next(`/login?redirect=${to.path}`);
      }
    } else {
      if (
        to.matched.some((record) => record.meta.requiresAdmin) &&
        !userStore.roles.includes("admin")
      ) {
        next({ path: "/" });
        return;
      }
      next();
    }
  } else {
    if (to.path === "/login" && userStore.token) {
      next({ path: "/" });
    } else {
      next();
    }
  }
});

export default router;
