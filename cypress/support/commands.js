// ***********************************************
// Custom Cypress commands
// ***********************************************

Cypress.Commands.add('loginAsTestUser', () => {
    const username = Cypress.env('userOne');
    const password = Cypress.env('passwordOne');

    if (!username || !password) {
        throw new Error('Set CYPRESS_USER_ONE and CYPRESS_PASSWORD_ONE to run authenticated Cypress tests.');
    }

    cy.visit('/login');
    cy.get('#basic_username').clear().type(username);
    cy.get('#basic_password').clear().type(password, { log: false });
    cy.get('button[type="submit"]').should('not.be.disabled').click();
});
