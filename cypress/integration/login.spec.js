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

    it('toggles password visibility from the login form', () => {
        cy.get('#basic_password').type('test-password', { log: false });
        cy.get('#basic_password').should('have.attr', 'type', 'password');

        cy.get('.ant-input-password-icon').click();
        cy.get('#basic_password').should('have.attr', 'type', 'text');

        cy.get('.ant-input-password-icon').click();
        cy.get('#basic_password').should('have.attr', 'type', 'password');
    });
});

const authenticatedSuite = (title, fn) => {
    describe(title, () => {
        before(function skipWithoutAuthenticatedUser() {
            cy.env(['userOne', 'passwordOne']).then(({ userOne, passwordOne }) => {
                if (!userOne || !passwordOne) {
                    this.skip();
                }
            });
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
