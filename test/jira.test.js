"use strict";
const expect = require("expect");

const Jira = require('../lib/jira');
const sinon = require("sinon");
const sandbox = sinon.createSandbox();
const nock = require('nock')

// root-level hooks below (for all test files)
let jira = null;
nock.disableNetConnect();

beforeEach("Using fake settings to create JIRA object", function() {
   const jiraSettings = {
      url: "bwa.nrs.gov.bc.ca/int/jira",
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
   //nock.activate();
});
afterEach("Completely restore all fakes created through the sandbox", function() {
   sandbox.restore();
   //nock.restore()
});

describe("Jira", function() {
   context("RFD", function() {
      it("should throw error", async function() {
         const issues=new Map();
         const links = [];

         let issueId = 123;

         issues.set('FAKE-123', {
            key: 'FAKE-123',
            fields: {
               fixVersions: ["0.0.0"]
            }
         });

         nock('https://bwa.nrs.gov.bc.ca')
         .get(/\/int\/jira\/rest\/api\/2\/issue\/.*/)
         .reply(200, (uri, requestBody) =>{
            const issueKey = uri.split('/').slice(-1)[0];
            return issues.get(issueKey)
         })   
         .persist();

         nock('https://bwa.nrs.gov.bc.ca')
         .get('/int/jira/rest/api/2/project/FAKE')
         .reply(200, {
            components: [{name:'FAKE'}]
         })
         .persist();

         nock('https://bwa.nrs.gov.bc.ca')
         .post('/int/jira/rest/api/2/issue')
         .reply(200, (uri, requestBody) =>{
            const newIssue = Object.assign({}, requestBody)
            const newId = issueId++;
            const issueStatus = "Submitted"
            newIssue.key = `FAKE-${newId}`;
            issues.set(newIssue.key, newIssue)
            return newIssue;
         })
         .persist();



         nock('https://bwa.nrs.gov.bc.ca')
         .post('/int/jira/rest/api/2/issueLink')
         .reply(200, (uri, requestBody) =>{
            links.push(requestBody);
            return requestBody;
         })
         .persist();
         

         nock('https://bwa.nrs.gov.bc.ca')
         .get(/\/int\/jira\/rest\/api\/2\/issue\/.*/)
         .reply(200, (uri, requestBody) =>{
            console.log(requestBody)
            return issues.get(issue.status.name)
         })   
         .persist();

         return jira.createRFD();
      });
   });
});