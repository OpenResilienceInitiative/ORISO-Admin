describe('login page', () => {
    beforeEach(() => {
        cy.visit('/login');
    });

    it('displays username and password fields', () => {
        cy.get('form').should('be.visible');
        cy.get('#basic_username').should('be.visible');
        cy.get('#basic_password').should('be.visible');
    });

    it('keeps submit disabled until username and password are filled', () => {
        cy.get('button[type="submit"]').should('be.disabled');
        cy.get('#basic_username').type('test-user');
        cy.get('button[type="submit"]').should('be.disabled');
        cy.get('#basic_password').type('test-password', { log: false });
        cy.get('button[type="submit"]').should('not.be.disabled');
    });
});

const authenticatedSuite = (title, fn) => {
    describe(title, () => {
        before(function () {
            if (!Cypress.env('userOne') || !Cypress.env('passwordOne')) {
                this.skip();
            }
        });

        fn();
    });
};

authenticatedSuite('authenticated admin', () => {
    beforeEach(() => {
        cy.loginAsTestUser();
    });

    it('redirects to the admin home after login', () => {
        cy.url().should('include', '/admin');
        cy.url().should('not.include', '/login');
    });

    it('can open the agency list page', () => {
        cy.visit('/agency');
        cy.url().should('include', '/agency');
    });
});
