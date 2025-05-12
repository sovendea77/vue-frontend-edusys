import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import {
  Setting,
  HomeFilled,
  User,
  EditPen,
  DataAnalysis,
} from "@element-plus/icons-vue";
import App from "./App.vue";
import "./assets/main.css";

// 导入路由配置
import router from "./router/index";

const app = createApp(App);
const pinia = createPinia();

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(pinia);
app.use(router);
app.use(ElementPlus);
app.mount("#app");
