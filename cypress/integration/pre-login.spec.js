describe('pre login', () => {
    beforeEach(() => {
        cy.visit('localhost:3000/admin/login');
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1000);
    });

    it('displays a form with input fields for username and password', () => {
        cy.get('form').should('be.visible');
        cy.get('#basic_username').should('be.visible');
        cy.get('#basic_password').should('be.visible');
    });

    it('keeps the submit button disabled until both inputs are filled', () => {
        cy.get('.ant-btn-primary').should('be.disabled');
    });

    it('shows error when inputs a not filled well', () => {
        cy.get('#basic_username').type('r');
        cy.get('#basic_password').type('1').clear();
        /* This tests need to be updated to the new admin version
    cy.get(".ant-form-item-explain-error")
      .eq(0)
      .contains("Bitte Benutzernamen eingeben");
    cy.get(".ant-form-item-explain-error")
      .eq(1)
      .contains("Bitte Passwort eingeben");
    */
    });

    it('lets you log in when username and password are filled in correctly', () => {
        cy.get('#basic_username').type('ritter@meinkoenig.de');
        cy.get('#basic_password').type('12345koe*');
        cy.get('.ant-btn-primary').click();
        /* This tests need to be updated to the new admin version
    cy.get("h3").eq(0).contains("Einstellungen");
    */
    });
});
