import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import type { App } from "vue";

export function installVueQuery(app: App) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 10_000,
      },
    },
  });

  app.use(VueQueryPlugin, { queryClient });
}

