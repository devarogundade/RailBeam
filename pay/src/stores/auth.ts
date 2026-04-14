import { defineStore } from "pinia";

const LS_KEY = "beam_pay_access_token";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken:
      (typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null) ??
      null,
  }),
  actions: {
    setAccessToken(token: string | null) {
      this.accessToken = token;
      if (typeof window === "undefined") return;
      if (!token) window.localStorage.removeItem(LS_KEY);
      else window.localStorage.setItem(LS_KEY, token);
    },
    clear() {
      this.setAccessToken(null);
    },
  },
});

