describe("Auth - Sign Up", () => {
  beforeEach(() => {
    cy.visit("/sign-up");
  });

  it("shows validation errors with empty fields", () => {
    cy.get('button[type="submit"]').click();
    cy.get("#name:invalid").should("exist");
  });

  it("shows an error when organisation is missing", () => {
    cy.get("#name").type("Test User");
    cy.get("#email").type("test@example.com");
    cy.get("#password").type("securepassword");
    cy.get('button[type="submit"]').click();

    cy.get("#organisation:invalid").should("exist");
  });

  it("shows an error for a duplicate email", () => {
    cy.get("#name").type("Admin User");
    cy.get("#organisation").type("Duplicate Org");
    cy.get("#email").type("admin@energycorp.com");
    cy.get("#password").type("securepassword");
    cy.get('button[type="submit"]').click();

    cy.get('[role="alert"]').should("be.visible");
  });

  it("signs up successfully with valid details", () => {
    const uniqueEmail = `testuser+${Date.now()}@example.com`;

    cy.get("#name").type("New User");
    cy.get("#organisation").type("New Organisation");
    cy.get("#email").type(uniqueEmail);
    cy.get("#password").type("securepassword");
    cy.get('button[type="submit"]').click();

    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
  });
});
