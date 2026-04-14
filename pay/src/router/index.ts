import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
} from "vue-router";
import DefaultView from "../views/DefaultView.vue";
import ReceiptView from "@/views/ReceiptView.vue";
import X402View from "@/views/X402View.vue";
import App from "@/App.vue";
import Home from "@/Home.vue";
import PaymentRoot from "@/views/payment/PaymentRoot.vue";
import PaymentShellLayout from "@/views/payment/PaymentShellLayout.vue";
import ShellHomeHeader from "@/components/shell/ShellHomeHeader.vue";
import ShellActivityHeader from "@/components/shell/ShellActivityHeader.vue";
import ShellAssetsHeader from "@/components/shell/ShellAssetsHeader.vue";
import ShellAgentsHeader from "@/components/shell/ShellAgentsHeader.vue";
import SendPaymentPage from "@/components/mobile/SendPaymentPage.vue";
import ReceivePaymentPage from "@/components/mobile/ReceivePaymentPage.vue";
import FundCardPage from "@/components/mobile/FundCardPage.vue";
import PaymentShellHome from "@/views/payment/PaymentShellHome.vue";
import PaymentShellScan from "@/views/payment/PaymentShellScan.vue";
import PaymentShellActivity from "@/views/payment/PaymentShellActivity.vue";
import PaymentShellAssets from "@/views/payment/PaymentShellAssets.vue";
import PaymentShellAgents from "@/views/payment/PaymentShellAgents.vue";
import PaymentShellAgentDetail from "@/views/payment/PaymentShellAgentDetail.vue";
import PaymentShellTxDetail from "@/views/payment/PaymentShellTxDetail.vue";
import PaymentShellTxSuccess from "@/views/payment/PaymentShellTxSuccess.vue";
import PaymentShellSubscriptionDetail from "@/views/payment/PaymentShellSubscriptionDetail.vue";
import { paymentUrlSignalsFromQuery } from "@/router/paymentSession";
import { useUiStore } from "@/stores/ui";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
  routes: [
    {
      path: "/",
      name: "app",
      component: App,
      children: [
        {
          path: "",
          name: "default",
          component: DefaultView,
        },
        {
          path: "x402/:resourceId",
          name: "x402",
          component: X402View,
        },
        {
          path: "p",
          component: PaymentRoot,
          children: [
            { path: "", redirect: { name: "payment-home" } },

            /** Dock / bottom-nav layout routes */
            {
              path: "",
              component: PaymentShellLayout,
              children: [
                {
                  path: "home",
                  name: "payment-home",
                  components: {
                    default: PaymentShellHome,
                    shellHeader: ShellHomeHeader,
                  },
                },
                {
                  path: "activity",
                  name: "payment-activity",
                  components: {
                    default: PaymentShellActivity,
                    shellHeader: ShellActivityHeader,
                  },
                },
                {
                  path: "assets",
                  name: "payment-assets",
                  components: {
                    default: PaymentShellAssets,
                    shellHeader: ShellAssetsHeader,
                  },
                },
                {
                  path: "agents",
                  name: "payment-agents",
                  components: {
                    default: PaymentShellAgents,
                    shellHeader: ShellAgentsHeader,
                  },
                },
              ],
            },

            /** Standalone routes (no dock layout) */
            { path: "send", name: "payment-send", component: SendPaymentPage },
            {
              path: "receive",
              name: "payment-receive",
              component: ReceivePaymentPage,
            },
            { path: "fund", name: "payment-fund", component: FundCardPage },
            { path: "scan", name: "payment-scan", component: PaymentShellScan },
            {
              path: "agents/:agentId",
              name: "payment-agent-detail",
              component: PaymentShellAgentDetail,
            },
            {
              path: "tx/:id",
              name: "payment-tx",
              component: PaymentShellTxDetail,
            },
            {
              path: "tx/:id/success",
              name: "payment-tx-success",
              component: PaymentShellTxSuccess,
            },
            {
              path: "subscription/:id",
              name: "payment-subscription",
              component: PaymentShellSubscriptionDetail,
            },
          ],
        },
      ],
    },
    {
      path: "/receipt",
      name: "home",
      component: Home,
      children: [
        {
          path: "/receipt",
          name: "receipt",
          component: ReceiptView,
        },
      ],
    },
  ],
});

router.beforeEach((to: RouteLocationNormalized) => {
  if (paymentUrlSignalsFromQuery(to.query)) {
    if (to.path.startsWith("/p")) {
      return { path: "/", query: to.query, replace: true };
    }
    return true;
  }
  if (to.path === "/" && to.name === "default") {
    return { path: "/p/home", replace: true };
  }
  return true;
});

router.afterEach((to: RouteLocationNormalized) => {
  const uiStore = useUiStore();
  const n = to.name?.toString() ?? "";
  uiStore.setCheckoutFlow(n === "default");
});

export default router;
