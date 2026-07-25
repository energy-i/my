import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents() {
      // implement node event listeners here
    },
  },

  env: {
    API_BASE_URL: "https://api.energy-i.ai/v1",
  },
});
