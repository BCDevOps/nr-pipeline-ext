"use strict";
const Jira = require('../lib/Jira');
const expect = require("expect");
var sandbox = require('sinon').createSandbox();
const {ENV, ISSUE_STATUS_NAME, ISSUE_LINK_TYPE_NAME, VERIFY_STATUS, REASON} = require("../lib/constants");
const {previousEnv} = require("../lib/util-functions");
const Verifier = require("../lib/InputDeployerVerify");

describe("obtainCurrentRfcRfdContext:", function() {
    this.timeout(50000);
    let jiraClientStub;

    this.beforeEach(function() {
        jiraClientStub = sandbox.stub(Jira.prototype);
    });

    this.afterEach(function() {
        sandbox.restore();
    });

    context("Function isReadyForDeployment()", function() {
        it.only("When RFDs blockedBy others, return result: status='Not Ready' , rfcRfdContext and reasonn with code: REASON_CODE_RFD_BLOCKED", async function() {
            // Arrange
            const rfcIssueKeyStub = 'MyRFCissue-99';
            const env = 'test';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const blockedByRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"Authorized for Test","rfdsByEnv":{"env":"test","rfds":[{"rfdIssueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Some Other Status","blockingOn":"RFD-AUTO-TEST-01"}]},{"rfdIssueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Some Other Status","blockedBy":[]}],"previousEnvRfds":[{"rfdIssueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Closed","labels":"auto"}]}};
            const rfcIssueKey = blockedByRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').returns(Promise.resolve(blockedByRfcRfdContext));

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            console.log('result:', result);

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.NOT_READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext", "reason"]));
            expect(result.rfcRfdContext).toEqual(blockedByRfcRfdContext);
            expect(result.reason.code).toEqual(REASON.REASON_CODE_RFD_BLOCKED);
            expect(result.reason.issueItems.length).not.toBe(0);
        });
    })

    context("Function obtainCurrentRfcRfdContext()", function() {
        it("At 'dlvr' env, With rfc/rfd issues can be found, returns Rfc/Rfd context for caller function", async function() {
            // Arrange
            const rfcIssueKeyStub = 'MyRFCissue-99';
            const rfcIssueStub = getDefaultRfcIssue();
    
            jiraClientStub.retrieveRfcIssueInfo.resolves(rfcIssueStub);
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_DLVR_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_DLVR_STUB));
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_TEST_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_STUB));
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_TEST_BUSINESS_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_BUSINESS_STUB));
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_PROD_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_PROD_STUB));
    
            // Act
            const dlvrEnv = 'dlvr';
            const dlvrVerifier = new Verifier(getDefaultSettings());
            const dlvrRfcRfdContext = await dlvrVerifier.obtainCurrentRfcRfdContext(dlvrEnv, rfcIssueKeyStub);
    
            // Verify
            sandbox.assert.calledOnce(jiraClientStub.retrieveRfcIssueInfo);
            sandbox.assert.calledWith(jiraClientStub.retrieveRfcIssueInfo, rfcIssueKeyStub);
            const getCalledCount = rfcIssueStub.fields.issuelinks.filter(link => link.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD).reduce((accumulator, link) => { return accumulator + 1}, 0);
            sandbox.assert.callCount(jiraClientStub.getIssue, getCalledCount);
            expect(dlvrRfcRfdContext.rfcIssueKey).toBe(rfcIssueKeyStub);
            expect(dlvrRfcRfdContext.rfdsByEnv.env).toEqual(dlvrEnv);
            expect(dlvrRfcRfdContext.rfdsByEnv.rfds).toBeInstanceOf(Array);
            dlvrRfcRfdContext.rfdsByEnv.rfds.forEach((rfdInfo) => {
                expect(rfdInfo.rfdIssueKey).toEqual(RFD_ISSUE_KEY_DLVR_STUB);
                expect(rfdInfo.blockedBy).toBeInstanceOf(Array);
                expect(rfdInfo.env).toEqual(dlvrEnv);
                if (rfdInfo.blockedBy) {
                    rfdInfo.blockedBy.forEach((blockedByIssue) => {
                        expect(blockedByIssue.blockingOn).toEqual(rfdInfo.rfdIssueKey);
                    })
                }
            });
            expect(dlvrRfcRfdContext.rfdsByEnv.previousEnvRfds).toBeInstanceOf(Array);
            expect(dlvrRfcRfdContext.rfdsByEnv.previousEnvRfds.every(p => p.env == previousEnv(dlvrEnv))).toBe(true);
            
        });
    
        it("At 'test' env, With rfc/rfd issues can be found, returns Rfc/Rfd context for caller function", async function() {
            // Arrange
            const rfcIssueKeyStub = 'MyRFCissue-99';
            const rfcIssueStub = getDefaultRfcIssue();
    
            jiraClientStub.retrieveRfcIssueInfo.resolves(rfcIssueStub);
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_DLVR_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_DLVR_STUB));
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_TEST_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_STUB));
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_TEST_BUSINESS_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_BUSINESS_STUB));
            jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_PROD_STUB).resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_PROD_STUB));
    
            // Act
            const testEnv = 'test';
            const testVerifier = new Verifier(getDefaultSettings());
            const testRfcRfdContext = await testVerifier.obtainCurrentRfcRfdContext(testEnv, rfcIssueKeyStub);
            // console.log('testRfcRfdContext', JSON.stringify(testRfcRfdContext));

            // Verify
            sandbox.assert.calledOnce(jiraClientStub.retrieveRfcIssueInfo);
            sandbox.assert.calledWith(jiraClientStub.retrieveRfcIssueInfo, rfcIssueKeyStub);
            const getCalledCount = rfcIssueStub.fields.issuelinks.filter(link => link.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD).reduce((accumulator, link) => { return accumulator + 1}, 0);
            sandbox.assert.callCount(jiraClientStub.getIssue, getCalledCount);
            expect(testRfcRfdContext.rfcIssueKey).toBe(rfcIssueKeyStub);
            expect(testRfcRfdContext.rfdsByEnv.env).toEqual(testEnv);
            expect(testRfcRfdContext.rfdsByEnv.rfds).toBeInstanceOf(Array);
            expect(testRfcRfdContext.rfdsByEnv.rfds.map(rfd => rfd.rfdIssueKey)).toEqual(expect.arrayContaining(['RFD-AUTO-TEST-01','RFD-BUSINESS-TEST-01']));
            testRfcRfdContext.rfdsByEnv.rfds.forEach((rfdInfo) => {
                expect(rfdInfo.blockedBy).toBeInstanceOf(Array);
                expect(rfdInfo.env).toEqual(testEnv);
                if (rfdInfo.blockedBy) {
                    rfdInfo.blockedBy.forEach((blockedByIssue) => {
                        expect(blockedByIssue.blockingOn).toEqual(rfdInfo.rfdIssueKey);
                    })
                }
            });
            expect(testRfcRfdContext.rfdsByEnv.previousEnvRfds).toBeInstanceOf(Array);
            expect(testRfcRfdContext.rfdsByEnv.previousEnvRfds.every(p => p.env == previousEnv(testEnv))).toBe(true);
        });
    })

});

const RFD_ISSUE_KEY_DLVR_STUB = 'RFD-AUTO-DLVR-01';
const RFD_ISSUE_KEY_TEST_STUB = 'RFD-AUTO-TEST-01';
const RFD_ISSUE_KEY_TEST_BUSINESS_STUB = 'RFD-BUSINESS-TEST-01';
const RFD_ISSUE_KEY_PROD_STUB = 'RFD-AUTO-PROD-01';

// Return default RfdIssueInfo based on previous RFC test setup.
// It generates random RFD status and random 'blckedBy' inwardIssue and its status.
function getDefaultRfdIssueInfo(rfdIssueKey) {
    const rfdInfoStub = {
        fields: {
            customfield_10121: {
                value: ''
            },
            status: {
                name: ''
            },
            labels: ''
        }
    };

    const rand1 = Math.random();
    let randomRfdStatus;
    if (rand1 < 0.3) {
        randomRfdStatus = ISSUE_STATUS_NAME.CLOSED;
    }
    else if (0.3 <= rand1 && rand1 < 0.7) {
        randomRfdStatus = ISSUE_STATUS_NAME.APPROVED;
    }
    else {
        randomRfdStatus = "Some Other Status";
    }

    // constructing rfdIssue status, customfield.
    switch(rfdIssueKey) {
        case RFD_ISSUE_KEY_DLVR_STUB :
            rfdInfoStub.fields.customfield_10121.value = ENV.DLVR;
            rfdInfoStub.fields.status.name = randomRfdStatus;
            rfdInfoStub.fields.labels = 'auto';
            break;
        case RFD_ISSUE_KEY_TEST_STUB :
            rfdInfoStub.fields.customfield_10121.value = ENV.TEST;
            rfdInfoStub.fields.status.name = randomRfdStatus;
            rfdInfoStub.fields.labels = 'auto';
            break;   
        case RFD_ISSUE_KEY_TEST_BUSINESS_STUB:
            rfdInfoStub.fields.customfield_10121.value = ENV.TEST;
            rfdInfoStub.fields.status.name = randomRfdStatus;
            rfdInfoStub.fields.labels = 'some-label';
            break;             
        case RFD_ISSUE_KEY_PROD_STUB :
            rfdInfoStub.fields.customfield_10121.value = ENV.PROD;
            rfdInfoStub.fields.status.name = randomRfdStatus;
            rfdInfoStub.fields.labels = 'auto';
            break;                      
    }

    // constructing rfd blockedBy issueLinks
    var isBlockedBy = Math.random() >= 0.5;
    if (isBlockedBy) {
        const num = Math.floor(Math.random() * 3) + 1; // num between 1..n
        const rfdIssueLinks = [];
        for (let i = 0; i< num; i++) {
            const inwardIssueKey = `INWARDISSUE-${i}`;
            const inwardIssueStatus =  (Math.random() >= 0.5)? ISSUE_STATUS_NAME.RESOLVED : "Some Other Status";
            const issueLink = { type: {inward: "is blocked by"}, inwardIssue: { key: inwardIssueKey, fields: { status: { name: inwardIssueStatus}}}};
            rfdIssueLinks.push(issueLink);
        }
        rfdInfoStub.fields['issuelinks'] = rfdIssueLinks;
    }
    // console.log('rfdInfoStub:', JSON.stringify(rfdInfoStub));
    return rfdInfoStub;
}

// Return default test object for RFC with issuelinks
// Note, changing default setup could affect tests result.
function getDefaultRfcIssue() {
    const rfdIssueLinkInfoWithRfcRfdTypeStub = {
        type: {
            name: ISSUE_LINK_TYPE_NAME.RFC_FRD
        },
        outwardIssue: {
            key: ''
        }
    };

    const dlrvAutoRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub));
    dlrvAutoRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_DLVR_STUB;
    const testAutoRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub));
    testAutoRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_TEST_STUB;
    const testBusinessCreatedRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub));
    testBusinessCreatedRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_TEST_BUSINESS_STUB;
    const prodAutoRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub));
    prodAutoRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_PROD_STUB;

    const rfdIssueLinkInfoWithNonRfcRfdTypeStub = {
        type: {
            name: 'NON_RFC_RFD_TYPE'
        }
    };

    const rand1 = Math.random();
    let randomRfcStatus;
    if (rand1 < 0.2) {
        randomRfcStatus = ISSUE_STATUS_NAME.AUTHORIZEDFORINT;
    }
    else if (0.2 <= rand1 && rand1 < 0.4) {
        randomRfcStatus = ISSUE_STATUS_NAME.AUTHORIZEDFORTEST;
    }
    else if (0.4 <= rand1 && rand1 < 0.6) {
        randomRfcStatus = ISSUE_STATUS_NAME.AUTHORIZEDFORPROD;
    }
    else {
        randomRfcStatus = "Some Other Status";
    }

    const rfcIssueStub = {
        fields: {
            status: {
                name: randomRfcStatus
            },
            issuelinks: [
                dlrvAutoRfdIssueLink,
                testAutoRfdIssueLink,
                testBusinessCreatedRfdIssueLink,
                prodAutoRfdIssueLink,
                rfdIssueLinkInfoWithNonRfcRfdTypeStub
            ]
        }
    };
    
    // console.log('rfcIssueStub:', JSON.stringify(rfcIssueStub));
    return rfcIssueStub;
}

function getDefaultSettings() {

    const defaultSettings = {
      "phases": {
        "build": {
          "namespace": "wp9gel-tools",
          "phase": "build",
          "tag": "build-1.0-1"
        },        
        "dlvr": {
          "namespace": "wp9gel-dev",
          "name": "wiof",
          "phase": "dev",
          "changeId": "99",
          "tag": "dev-1.0",
          "instance": "wiof-dlvr",
          "transient": false,
          "host": "wiof-dlvr-wp9gel-dev.pathfinder.bcgov",
          "credentials": {
            "idir": {
              "user": "stub@gov.bc.ca",
              "pass": "stub"
            }
          }
        },
        "test": {
          "namespace": "wp9gel-test",
          "name": "wiof",
          "phase": "test",
          "changeId": "99",
          "tag": "test-1.0",
          "instance": "wiof-test",
          "transient": false,
          "host": "siwe-test-wp9gel-test.pathfinder.bcgov",
          "credentials": {
            "idir": {
                "user": "fake@gov.bc.ca",
                    "pass": "fakePass"
                }
            }
         }
      },
      "options": {
        "git": {
          "branch": {
            "name": "master",
            "merge": "master",
            "remote": "master"
          },
          "url": "https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git",
          "dir": "/Users/iliu/Workspace/Repo/spi/spi-siwe-ear",
          "uri": "https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git",
          "http_url": "https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git",
          "owner": "SIWE",
          "repository": "siwe-siwe-ear"
        },
        "env": "dlvr",
        "pr": "99",
        "cwd": "/some/user/Workspace/Repo/spi/spi-siwe-ear"
      },
      "jiraUrl": "bwa.nrs.gov.bc.ca/int/jira",
      "bitbucketUrl": "https://bwa.nrs.gov.bc.ca/int/stash",
      "phase": "dlvr"
    };
    return defaultSettings;
  } // getDefaultSettings