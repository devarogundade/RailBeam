import "./polyfills";
import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import Root from "./Root.vue";
import router from "./router";
import { installVueQuery } from "@/query/queryClient";

const app = createApp(Root);

app.use(createPinia());
installVueQuery(app);
app.use(router);

app.mount("#app");
