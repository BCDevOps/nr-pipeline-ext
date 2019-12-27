"use strict";
const Jira = require('../lib/Jira');
const expect = require("expect");
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
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
        it("When RFC is not found, Error throws", async function() {
            jiraClientStub.retrieveRfcIssueInfo.resolves(undefined);

            // Act
            const verifier = new Verifier(getDefaultSettings());
            return expect(verifier.isReadyForDeployment('dlvr', 'invalidIssueKey')).rejects.toThrow();
        });

        it("When RFDs blockedBy others, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFD_BLOCKED", async function() {
            // Arrange
            const env = 'test';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const blockedByRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"Authorized for Test","rfdsByEnv":{"test": {"rfds":[{"rfdIssueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Some Other Status","blockingOn":"RFD-AUTO-TEST-01"}]},{"rfdIssueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Some Other Status","blockedBy":[]}],"previousEnvRfds":[{"rfdIssueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Closed","labels":"auto"}]}}};
            const rfcIssueKey = blockedByRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').returns(Promise.resolve(blockedByRfcRfdContext));

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            // console.log('result:', JSON.stringify(result));

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.NOT_READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext", "reason"]));
            expect(result.rfcRfdContext).toEqual(blockedByRfcRfdContext);
            expect(result.reason.code).toEqual(REASON.REASON_CODE_RFD_BLOCKED);
            expect(result.reason.issueItems.length).not.toBe(0);
            const rfds = blockedByRfcRfdContext.rfdsByEnv[env].rfds.map(rfd => rfd.rfdIssueKey);
            result.reason.issueItems.forEach(item => {
                expect(item.status).not.toBe(ISSUE_STATUS_NAME.RESOLVED);
                expect(rfds).toContain(item.blockingOn);
            });
        });

        it("Some of current stage RFDs are not approved, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFD_NOT_APPROVED", async function() {
            // Arrange
            const env = 'test';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const rfdNotApprovedRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"Authorized for Test","rfdsByEnv":{"test": {"rfds":[{"rfdIssueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-AUTO-TEST-01"}]},{"rfdIssueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Some Other Status","blockedBy":[]}],"previousEnvRfds":[{"rfdIssueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Closed","labels":"auto"}]}}};
            const rfcIssueKey = rfdNotApprovedRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(rfdNotApprovedRfcRfdContext);

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            // console.log('result:', JSON.stringify(result));

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.NOT_READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext", "reason"]));
            expect(result.rfcRfdContext).toEqual(rfdNotApprovedRfcRfdContext);
            expect(result.reason.code).toEqual(REASON.REASON_CODE_RFD_NOT_APPROVED);
            expect(result.reason.issueItems.length).not.toBe(0);
            const resultIssueItemsIssueKeys = result.reason.issueItems.map(item => item.rfdIssueKey);
            expect(resultIssueItemsIssueKeys).toContain(rfdNotApprovedRfcRfdContext.rfdsByEnv[env].rfds[1].rfdIssueKey);
            result.reason.issueItems.forEach((issueItem) => {
                expect(issueItem.env).toEqual(env);
                expect(issueItem.status).not.toEqual(ISSUE_STATUS_NAME.APPROVED);
            });
        });

        it("Some of previous stage RFDs are not closed, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_PREVIOUS_RFD_NOT_CLOSED", async function() {
            // Arrange
            const env = 'test';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const previousRfdNotClosedRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"Authorized for Test","rfdsByEnv":{"test": {"rfds":[{"rfdIssueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-AUTO-TEST-01"}]},{"rfdIssueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-1","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-2","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"}]}],"previousEnvRfds":[{"rfdIssueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Approved","labels":"auto"}]}}};
            const rfcIssueKey = previousRfdNotClosedRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(previousRfdNotClosedRfcRfdContext);

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            // console.log('result:', JSON.stringify(result));

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.NOT_READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext", "reason"]));
            expect(result.rfcRfdContext).toEqual(previousRfdNotClosedRfcRfdContext);
            expect(result.reason.code).toEqual(REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED);
            expect(result.reason.issueItems.length).not.toBe(0);
            const resultIssueItemsIssueKeys = result.reason.issueItems.map(item => item.rfdIssueKey);
            expect(resultIssueItemsIssueKeys).toContain(previousRfdNotClosedRfcRfdContext.rfdsByEnv[env].previousEnvRfds[0].rfdIssueKey);
            result.reason.issueItems.forEach((issueItem) => {
                expect(issueItem.env).toEqual(previousEnv(env));
                expect(issueItem.status).not.toEqual(ISSUE_STATUS_NAME.CLOSED);
            });
        });    

        it("ENV=dlvr but RFC is not Authorized to Int, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFC_NOT_AUTHORIZED", async function() {
            // Arrange
            const env = 'dlvr';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const dlvrRFCnotAuthorizedRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"In Review for Int","rfdsByEnv":{"dlvr": {"rfds":[{"rfdIssueKey":"RFD-AUTO-DLVR-01","labels":"auto","env":"dlvr","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-AUTO-DLVR-01"}]}],"previousEnvRfds":[]}}};
            const rfcIssueKey = dlvrRFCnotAuthorizedRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(dlvrRFCnotAuthorizedRfcRfdContext);

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            // console.log('result:', JSON.stringify(result));

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.NOT_READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext", "reason"]));
            expect(result.rfcRfdContext).toEqual(dlvrRFCnotAuthorizedRfcRfdContext);
            expect(result.reason.code).toEqual(REASON.REASON_CODE_RFC_NOT_AUTHORIZED);
            expect(result.reason.issueItems.length).not.toBe(0);
            expect(result.reason.issueItems.rfcIssueKey).toEqual(rfcIssueKey);
            expect(result.reason.issueItems.rfcStatus).not.toEqual(ISSUE_STATUS_NAME.AUTHORIZEDFORINT);
        });    

        it("ENV=test but RFC is not Authorized to Test, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFC_NOT_AUTHORIZED", async function() {
            // Arrange
            const env = 'test';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const testRFCnotAuthorizedRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"In Review for Test","rfdsByEnv":{"test": {"rfds":[{"rfdIssueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-AUTO-TEST-01"}]},{"rfdIssueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-1","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-2","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"}]}],"previousEnvRfds":[{"rfdIssueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Closed","labels":"auto"}]}}};
            const rfcIssueKey = testRFCnotAuthorizedRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(testRFCnotAuthorizedRfcRfdContext);

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            // console.log('result:', JSON.stringify(result));

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.NOT_READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext", "reason"]));
            expect(result.rfcRfdContext).toEqual(testRFCnotAuthorizedRfcRfdContext);
            expect(result.reason.code).toEqual(REASON.REASON_CODE_RFC_NOT_AUTHORIZED);
            expect(result.reason.issueItems.length).not.toBe(0);
            expect(result.reason.issueItems.rfcIssueKey).toEqual(rfcIssueKey);
            expect(result.reason.issueItems.rfcStatus).not.toEqual(ISSUE_STATUS_NAME.AUTHORIZEDFORTEST);
        }); 

        it("ENV=prod but RFC is not Authorized to Prod, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFC_NOT_AUTHORIZED", async function() {
            // Arrange
            const env = 'prod';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const prodRFCnotAuthorizedRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"In Review for Prod","rfdsByEnv":{"prod": {"rfds":[{"rfdIssueKey":"RFD-AUTO-PROD-01","labels":"auto","env":"prod","status":"Approved","blockedBy":[]}],"previousEnvRfds":[{"rfdIssueKey":"RFD-AUTO-TEST-01","env":"test","status":"Closed","labels":"auto"}]}}};
            const rfcIssueKey = prodRFCnotAuthorizedRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(prodRFCnotAuthorizedRfcRfdContext);

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            // console.log('result:', JSON.stringify(result));

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.NOT_READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext", "reason"]));
            expect(result.rfcRfdContext).toEqual(prodRFCnotAuthorizedRfcRfdContext);
            expect(result.reason.code).toEqual(REASON.REASON_CODE_RFC_NOT_AUTHORIZED);
            expect(result.reason.issueItems.length).not.toBe(0);
            expect(result.reason.issueItems.rfcIssueKey).toEqual(rfcIssueKey);
            expect(result.reason.issueItems.rfcStatus).not.toEqual(ISSUE_STATUS_NAME.AUTHORIZEDFORPROD);
            expect(result.reason.issueItems.rfdsByEnv[env].previousEnvRfds[0].env).toEqual(previousEnv(env));
        }); 

        it("When all conditions passed verification, return result: status='Ready' and rfcRfdContext", async function() {
            // Arrange
            const env = 'test';
            const settings = getDefaultSettings();
            settings.options.env = env;
            settings.phase = env;
            const verifier = new Verifier(settings);
            const testAllVerifiedRfcRfdContext = {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"Authorized for Test","rfdsByEnv":{"test": {"rfds":[{"rfdIssueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-AUTO-TEST-01"}]},{"rfdIssueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-1","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-2","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"}]}],"previousEnvRfds":[{"rfdIssueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Closed","labels":"auto"}]}}};
            const rfcIssueKey = testAllVerifiedRfcRfdContext.rfcIssueKey;
            sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(testAllVerifiedRfcRfdContext);

            // Act
            const result = await verifier.isReadyForDeployment(env, rfcIssueKey);
            // console.log('result:', JSON.stringify(result));

            // Verify
            sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey);
            expect(result.status).toEqual(VERIFY_STATUS.READY);
            expect(Object.keys(result)).toEqual(expect.arrayContaining(["status", "rfcRfdContext"]));
            expect(result.rfcRfdContext).toEqual(testAllVerifiedRfcRfdContext);
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
            const env = 'dlvr';
            const dlvrVerifier = new Verifier(getDefaultSettings());
            const dlvrRfcRfdContext = await dlvrVerifier.obtainCurrentRfcRfdContext(env, rfcIssueKeyStub);
            // console.log('dlvrRfcRfdContext', JSON.stringify(dlvrRfcRfdContext));

            // Verify
            sandbox.assert.calledOnce(jiraClientStub.retrieveRfcIssueInfo);
            sandbox.assert.calledWith(jiraClientStub.retrieveRfcIssueInfo, rfcIssueKeyStub);
            const getCalledCount = rfcIssueStub.fields.issuelinks.filter(link => link.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD).reduce((accumulator, link) => { return accumulator + 1}, 0);
            sandbox.assert.callCount(jiraClientStub.getIssue, getCalledCount);
            expect(dlvrRfcRfdContext.rfcIssueKey).toBe(rfcIssueKeyStub);
            expect(Object.keys(dlvrRfcRfdContext.rfdsByEnv)).toContain(env);
            expect(dlvrRfcRfdContext.rfdsByEnv[env].rfds).toBeInstanceOf(Array);
            dlvrRfcRfdContext.rfdsByEnv[env].rfds.forEach((rfdInfo) => {
                expect(rfdInfo.rfdIssueKey).toEqual(RFD_ISSUE_KEY_DLVR_STUB);
                expect(rfdInfo.blockedBy).toBeInstanceOf(Array);
                expect(rfdInfo.env).toEqual(env);
                if (rfdInfo.blockedBy) {
                    rfdInfo.blockedBy.forEach((blockedByIssue) => {
                        expect(blockedByIssue.blockingOn).toEqual(rfdInfo.rfdIssueKey);
                    })
                }
            });
            expect(dlvrRfcRfdContext.rfdsByEnv[env].previousEnvRfds).toBeInstanceOf(Array);
            expect(dlvrRfcRfdContext.rfdsByEnv[env].previousEnvRfds.every(p => p.env == previousEnv(env))).toBe(true);
            
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
            const env = 'test';
            const testVerifier = new Verifier(getDefaultSettings());
            const testRfcRfdContext = await testVerifier.obtainCurrentRfcRfdContext(env, rfcIssueKeyStub);
            console.log('testRfcRfdContext', JSON.stringify(testRfcRfdContext));

            // Verify
            sandbox.assert.calledOnce(jiraClientStub.retrieveRfcIssueInfo);
            sandbox.assert.calledWith(jiraClientStub.retrieveRfcIssueInfo, rfcIssueKeyStub);
            const getCalledCount = rfcIssueStub.fields.issuelinks.filter(link => link.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD).reduce((accumulator, link) => { return accumulator + 1}, 0);
            sandbox.assert.callCount(jiraClientStub.getIssue, getCalledCount);
            expect(testRfcRfdContext.rfcIssueKey).toBe(rfcIssueKeyStub);
            expect(Object.keys(testRfcRfdContext.rfdsByEnv)).toContain(env);
            expect(testRfcRfdContext.rfdsByEnv[env].rfds).toBeInstanceOf(Array);
            expect(testRfcRfdContext.rfdsByEnv[env].rfds.map(rfd => rfd.rfdIssueKey)).toEqual(expect.arrayContaining(['RFD-AUTO-TEST-01','RFD-BUSINESS-TEST-01']));
            testRfcRfdContext.rfdsByEnv[env].rfds.forEach((rfdInfo) => {
                expect(rfdInfo.blockedBy).toBeInstanceOf(Array);
                expect(rfdInfo.env).toEqual(env);
                if (rfdInfo.blockedBy) {
                    rfdInfo.blockedBy.forEach((blockedByIssue) => {
                        expect(blockedByIssue.blockingOn).toEqual(rfdInfo.rfdIssueKey);
                    })
                }
            });
            expect(testRfcRfdContext.rfdsByEnv[env].previousEnvRfds).toBeInstanceOf(Array);
            expect(testRfcRfdContext.rfdsByEnv[env].previousEnvRfds.every(p => p.env == previousEnv(env))).toBe(true);
        });

        it("When RFC is not found, Error throws", async function() {
            jiraClientStub.retrieveRfcIssueInfo.resolves(undefined);

            // Act
            const verifier = new Verifier(getDefaultSettings());
            return expect(verifier.obtainCurrentRfcRfdContext('dlvr', 'invalidIssueKey')).rejects.toThrow();
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