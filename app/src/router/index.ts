import { createRouter, createWebHistory } from "vue-router";
import TreasuryView from "../views/TreasuryView.vue";
import SubscriptionView from "@/views/subscriptions/SubscriptionView.vue";
import PlansView from "@/views/subscriptions/PlansView.vue";
import ChatView from "@/views/ChatView.vue";
import ChatAgentNew from "@/views/ChatAgentNew.vue";
import SettingsView from "@/views/SettingsView.vue";
import ConnectView from "@/views/onboarding/ConnectView.vue";
import App from "@/App.vue";
import Home from "@/Home.vue";
import WatchView from "@/views/onboarding/WatchView.vue";
import ProfileView from "@/views/onboarding/ProfileView.vue";
import ReviewView from "@/views/onboarding/ReviewView.vue";
import MultisigView from "@/views/onboarding/MultisigView.vue";
import GeneralView from "@/views/settings/GeneralView.vue";
import WalletSettings from "@/views/settings/WalletSettings.vue";
import PaymentsSettingsView from "@/views/settings/PaymentsSettingsView.vue";
import AcceptPaymentView from "@/views/accept-payments/AcceptPaymentView.vue";
import CustomerView from "@/views/accept-payments/CustomerView.vue";
import X402View from "@/views/accept-payments/x402View.vue";

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
      path: "/onboarding",
      name: "onboarding",
      component: Home,
      children: [
        {
          path: "/onboarding",
          name: "onboarding-wallet",
          component: ConnectView,
        },
        {
          path: "/onboarding/watch",
          name: "onboarding-watch-wallet",
          component: WatchView,
        },
        {
          path: "/onboarding/profile",
          name: "onboarding-connect-profile",
          component: ProfileView,
        },
        {
          path: "/onboarding/multisig",
          name: "onboarding-connect-multisig",
          component: MultisigView,
        },
        {
          path: "/onboarding/review",
          name: "onboarding-connect-review",
          component: ReviewView,
        },
      ],
    },
    {
      path: "/",
      name: "app",
      component: App,
      children: [
        {
          path: "/",
          name: "treasury",
          component: TreasuryView,
        },
        {
          path: "/accept-payment",
          component: AcceptPaymentView,
          children: [
            {
              path: "",
              name: "accept-payment",
              component: CustomerView,
            },
            {
              path: "x402",
              name: "accept-payment-x402",
              component: X402View,
            },
          ],
        },
        {
          path: "/subscriptions",
          name: "subscriptions",
          component: SubscriptionView,
          children: [
            {
              path: "/subscriptions",
              name: "subscriptions-plans",
              component: PlansView,
            },
          ],
        },

        {
          path: "/agents",
          name: "agents",
          component: ChatView,
        },
        {
          path: "/agents/new",
          name: "agents-new",
          component: ChatAgentNew,
        },
        {
          path: "/settings",
          name: "settings",
          component: SettingsView,
          children: [
            {
              path: "/settings",
              name: "settings-general",
              component: GeneralView,
            },
            {
              path: "/settings/payments",
              name: "settings-payments",
              component: PaymentsSettingsView,
            },
            {
              path: "/settings/wallet",
              name: "settings-wallet",
              component: WalletSettings,
            },
          ],
        },
      ],
    },
  ],
});

export default router;
