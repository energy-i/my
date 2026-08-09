/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add(
  "login",
  (email = "admin@energycorp.com", password = "password") => {
    cy.session([email, password], () => {
      cy.visit("/sign-in");
      cy.get("#email").type(email);
      cy.get("#password").type(password);
      cy.get('button[type="submit"]').click();
      cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
    });
  },
);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
    }
  }
}

export {};
