import "./polyfills";
import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin, type VueQueryPluginOptions } from "@tanstack/vue-query";

import Root from "./Root.vue";
import router from "./router";
import { initWeb3Modal } from "./scripts/web3modalInit";

initWeb3Modal();

const app = createApp(Root);

app.use(createPinia());
app.use(router);

const vueQueryOpts: VueQueryPluginOptions = {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 10_000,
      },
    },
  },
};
app.use(VueQueryPlugin, vueQueryOpts);

app.mount("#app");
