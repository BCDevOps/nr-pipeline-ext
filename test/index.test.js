"use strict";
const expect = require("expect");

const { Jira } = require("../index.js");
const sinon = require("sinon");
const sandbox = sinon.createSandbox();

// root-level hooks below (for all test files)
let jira = null;

beforeEach("Using fake settings to create JIRA object", function() {
   const jiraSettings = {
      url: "bwa123.nrs.gov.bc.ca/int/jira",
      username: `fake`,
      password: `fake`,
      rfcIssueKey: `FAKE-123`,
      changeBranch: `FAKE-123-rfc`,
      branchName: `PR-456`,
      repoName: `FAKE`,
      projectName: `FAKE`,
      version: `1.0.0`
   };

   // Create the jira object of the type Jira
   jira = new Jira(Object.assign({}, { phase: "jira-update", jira: jiraSettings }));
});
afterEach("Completely restore all fakes created through the sandbox", function() {
   sandbox.restore();
});

describe("retrieveRfcIssueInfo(): wrapper function to retrieve RFC issue", function() {
   context("With no argument", function() {
      it("should throw error", async function() {
         const issue = await jira.retrieveRfcIssueInfo(null);
         expect(issue).toEqual(new Error("Missing 'rfcIssueKey' argument"));
      });
   });
});

describe("JIRA - Create RFD logic", function() {
   this.timeout(10000);

   it("requires - Jira", function() {
      expect(Jira).toEqual(expect.anything());
   }); //end it
   it("Jira - retrieveRfcIssueInfo", async function() {
      var stub = sandbox.stub(jira, "getJiraClient");
      stub.returns({
         issue: {
            getIssue: function() {
               return Promise.resolve({ fields: { issuelinks: [], status: { name: "abc" } } });
            },
            createIssue: function() {
               return Promise.resolve({ key: "asdasda-2" });
            }
         },
         issueLink: {
            createIssueLink: function() {}
         }
      });

      const issue = await jira.retrieveRfcIssueInfo("RFC-123");
      expect(issue).toHaveProperty("fields");
      expect(issue).toHaveProperty("fields.status.name");
   });
   it("Jira - initializeProjectComponent", async function() {
      var stub = sandbox.stub(jira, "getJiraClient");
      stub.returns({
         project: {
            getProject: function() {
               return Promise.resolve({ components: [] });
            }
         },
         component: {
            createComponent: function() {
               return Promise.resolve({});
            }
         }
      });
      const issue = await jira.initializeProjectComponent("FAKE", "fake-db");
   });
}); //end describe
