"use strict";
const expect = require("expect");
const sinon = require("sinon");
const ManageDaReview = require('../lib/InputDeployerVerify.js')
const idir = require("./idir.local.json");

describe("Fetch RFC Issue", function() {

    const jiraSettings= { 
        url: "https://bwa123.nrs.gov.bc.ca/int/jira/", 
        username: "FAKE", 
        password: "FAKE", 
        rfcIssueKey: "FAKE-123"
       }
       const jiraClient = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings}))
       it("", function() {
        return manageDaReview.doSchemaDetail("CWI_SPI_DC", "/tmp/CWI_SPI_DC.txt")
        .then((result) => {
           expect(result.exitCode).toBe(0);
           expect(result.stderr).toBe("");
        });
     })
  });
});