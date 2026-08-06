// ***********************************************
// Custom Cypress commands
// ***********************************************

Cypress.Commands.add('loginAsTestUser', () => {
    cy.env(['userOne', 'passwordOne']).then(({ userOne: username, passwordOne: password }) => {
        if (!username || !password) {
            throw new Error('Set CYPRESS_USER_ONE and CYPRESS_PASSWORD_ONE to run authenticated Cypress tests.');
        }

        cy.visit('/login');
        cy.get('#basic_username').clear();
        cy.get('#basic_username').type(username);
        cy.get('#basic_password').clear();
        cy.get('#basic_password').type(password, { log: false });
        cy.get('button[type="submit"]').should('not.be.disabled').click();
    });
});
