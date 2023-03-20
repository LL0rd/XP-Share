import { Given } from "cypress-cucumber-preprocessor/steps";

Given('somebody reported the following posts:', table => {
  table.hashes().forEach(({ submitterEmail, resourceId, reasonCategory, reasonDescription }) => {
    const submitter = {
      email: submitterEmail,
      password: '1234'
    }
    cy.factory()
      .build('user', {}, submitter)
      .authenticateAs(submitter)
      .mutate(`mutation($resourceId: ID!, $reasonCategory: ReasonCategory!, $reasonDescription: String!) {
        fileReport(resourceId: $resourceId, reasonCategory: $reasonCategory, reasonDescription: $reasonDescription) {
          reportId
        }
      }`, {
        resourceId,
        reasonCategory,
        reasonDescription
      })
  })
})