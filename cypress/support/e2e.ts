// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

import { installApiStubs } from "./api-stubs";

// Stub every API request so tests never hit the real backend. Individual
// tests can still register more specific `cy.intercept` calls after this
// runs — later intercepts take precedence.
beforeEach(() => {
  cy.env(["API_BASE_URL"]).then((values) => {
    const apiBaseUrl =
      values && typeof values === "object" && "API_BASE_URL" in values
        ? (values as Record<string, unknown>).API_BASE_URL
        : Array.isArray(values)
          ? values[0]
          : values;
    installApiStubs(String(apiBaseUrl ?? ""));
  });
});
