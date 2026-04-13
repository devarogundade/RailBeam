import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import Root from "./Root.vue";
import router from "./router";
import { initWeb3Modal } from "./scripts/web3modalInit";

initWeb3Modal();

const app = createApp(Root);

app.use(createPinia());
app.use(router);

app.mount("#app");
