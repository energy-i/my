import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: "http://localhost:4173",
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
