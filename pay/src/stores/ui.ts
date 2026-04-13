import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", {
  state: () => ({
    checkoutFlow: false,
  }),
  actions: {
    setCheckoutFlow(value: boolean) {
      this.checkoutFlow = value;
    },
  },
});
