/* eslint-disable cypress/no-unnecessary-waiting */
/* eslint-disable func-names */

// This tests need to be updated to the new admin version
// const USERONEEMAIL = Cypress.env("userOne");
// const USERONEPASSWORD = Cypress.env("passwordOne");

// describe("Check counselor page and edit name", function () {
//   beforeEach(() => {
//     cy.visit("/");
//     cy.get("#basic_username").type(USERONEEMAIL);
//     cy.get("#basic_password").type(USERONEPASSWORD);
//     cy.get(".ant-btn-primary").click();
//     cy.wait(100);
//     cy.get(".menuItem").eq(1).click();
//     cy.wait(1000);
//   });

//   it("Checks Title", function () {
//     cy.get("h3").eq(0).contains("Berater");
//   });

//   it("Checks list is visible and contains counselors", function () {
//     cy.get(".ant-table-wrapper").should("be.visible");
//     cy.wait(1000);
//     cy.get(".ant-table-row").should("be.visible");
//   });

//   it("Checks Edit Button", function () {
//     cy.get(".ant-table-row-level-0").eq(0);
//     cy.get(".editIcon").eq(0).click();
//     cy.wait(100);
//     cy.get(".ant-form").eq(0);
//     cy.get(".ant-form-item").eq(0);
//     cy.get("#firstname").clear({ scrollBehavior: false }).type("Christoph");
//     cy.get(".saveIcon").eq(0).click();
//     cy.get(".ant-form").eq(0);
//     // will be fixed with real counselor Data
//     // cy.get(".ant-form-item-control").eq(0).contains("Christoph");
//   });
// });

// describe("Check Counselor page and delete Card/Counselor", function () {
//   beforeEach(() => {
//     cy.visit("/");
//     cy.get("#basic_username").type(USERONEEMAIL);
//     cy.get("#basic_password").type(USERONEPASSWORD);
//     cy.get(".ant-btn-primary").click();
//     cy.wait(100);
//     cy.get(".menuItem").eq(1).click();
//     cy.wait(1000);
//   });

//   it("Checks Delete Button opens modal", function () {
//     cy.get("form")
//       .eq(0)
//       .within(() => {
//         cy.get(".deleteIcon").eq(1).should("exist").click();
//       });
//     cy.root().get(".ant-modal").should("be.visible");
//   });

//   it("Check Delete Button removes 1 Card", function () {
//     // will be fixed with real counselor Data
//     // let countedForms;
//     cy.get("form").its("length");
//     /* .then((length) => {
//         // countedForms = length;
//       });
//        */

//     cy.get("form")
//       .eq(0)
//       .within(() => {
//         cy.get(".deleteIcon").eq(1).should("exist").click();
//       });
//     cy.root()
//       .get(".ant-modal")
//       .within(() => {
//         cy.get("button").eq(1).click();
//       });

//     // will be fixed with real counselor Data
//     /* cy.get("form")
//       .its("length")
//       .then((length) => {
//         assert(countedForms - 1 === length);
//       }); */
//   });
// });
