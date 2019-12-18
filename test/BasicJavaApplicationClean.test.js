'use strict';
const expect = require("expect");
const sandbox = require('sinon').createSandbox();
const {ENV} = require('../lib/constants');
const {OpenShiftClientX} = require('pipeline-cli')
const BasicJavaApplicationClean = require('../lib/BasicJavaApplicationClean');

describe("BasicJavaApplicationDeployer:", function() {
    this.timeout(50000);

    let cleanner;
    const defaultSettings = getDefaultSettings(); // do not modify this settings.

    this.beforeEach(function() {
        cleanner = new BasicJavaApplicationClean(defaultSettings);
    })

    context("Obtaining target phase(s)", function() {
        it("Argument for env='all', it should include targets for: 'build' and 'dev' as current target phases.", function() {
            const targetPhases = cleanner.getTargetPhases('all');
            expect(targetPhases).toContain(ENV.BUILD);
            expect(targetPhases).toContain(ENV.DEV);
            expect(targetPhases).not.toContain(ENV.DLVR);
            expect(targetPhases).not.toContain(ENV.TEST);
            expect(targetPhases).not.toContain(ENV.PROD);
        });

        it("Argument for env='transient', it should include targets for: 'build' and 'dev' as current target phases.", function() {
            const targetPhases = cleanner.getTargetPhases('transient');
            expect(targetPhases).toContain(ENV.BUILD);
            expect(targetPhases).toContain(ENV.DEV);
            expect(targetPhases).not.toContain(ENV.DLVR);
            expect(targetPhases).not.toContain(ENV.TEST);
            expect(targetPhases).not.toContain(ENV.PROD);
        });

        it("Argument for env='test', it should only have 'test' as target phase.", function() {
            const targetPhases = cleanner.getTargetPhases('test');
            expect(targetPhases).not.toContain(ENV.BUILD);
            expect(targetPhases).not.toContain(ENV.DEV);
            expect(targetPhases).not.toContain(ENV.DLVR);
            expect(targetPhases).toContain(ENV.TEST);
            expect(targetPhases).not.toContain(ENV.PROD);
        });
    });

}); // end BasicJavaApplicationDeployer unit tests.


function getDefaultSettings() {
    const defaultSettings = {
        "phases": {
           "build": {
              "namespace": "wp9gel-tools",
              "name": "siwe",
              "phase": "build",
              "changeId": "99",
              "suffix": "-build-99",
              "tag": "build-1.0-99",
              "instance": "siwe-build-99",
              "transient": true,
              "host": "",
              "credentials": {
                 "idir": {
                    "user": "fake@gov.bc.ca",
                    "pass": "fakePass"
                 }
              }
           },
           "dev": {
              "namespace": "wp9gel-dev",
              "name": "siwe",
              "phase": "dev",
              "changeId": "99",
              "suffix": "-dev-99",
              "tag": "dev-1.0-99",
              "instance": "siwe-dev-99",
              "transient": true,
              "host": "siwe-dev-99-wp9gel-dev.pathfinder.bcgov",
              "credentials": {
                 "idir": {
                    "user": "fake@gov.bc.ca",
                    "pass": "fakePass"
                 }
              }
           },
           "dlvr": {
              "namespace": "wp9gel-dev",
              "name": "siwe",
              "phase": "dev",
              "changeId": "99",
              "suffix": "-dlvr",
              "tag": "dlvr-1.0",
              "instance": "siwe-dlvr",
              "transient": false,
              "host": "siwe-dlvr-wp9gel-dev.pathfinder.bcgov",
              "credentials": {
                 "idir": {
                    "user": "fake@gov.bc.ca",
                    "pass": "fakePass"
                 }
              }
           },
           "test": {
              "namespace": "wp9gel-test",
              "name": "siwe",
              "phase": "test",
              "changeId": "99",
              "suffix": "-test",
              "tag": "test-1.0",
              "instance": "siwe-test",
              "transient": false,
              "host": "siwe-test-wp9gel-test.pathfinder.bcgov",
              "credentials": {
                 "idir": {
                    "user": "fake@gov.bc.ca",
                    "pass": "fakePass"
                 }
              }
           },
           "prod": {
              "namespace": "wp9gel-prod",
              "name": "siwe",
              "phase": "prod",
              "changeId": "99",
              "suffix": "-prod",
              "tag": "prod-1.0",
              "instance": "siwe-prod-99",
              "transient": false,
              "host": "siwe-prod-wp9gel-prod.pathfinder.bcgov",
              "credentials": {
                 "idir": {
                    "user": "fake@gov.bc.ca",
                    "pass": "fakePass"
                 }
              }
           }
        },
        "options": {
           "git": {
              "branch": {
                 "name": "feature/ZERO-1103-add-ha-capability",
                 "merge": "feature/ZERO-1103-add-ha-capability",
                 "remote": "feature/ZERO-1103-add-ha-capability"
              },
              "url": "https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git",
              "change": {
                 "target": "SIWE-73-test-siwe-pipeline-deployment"
              },
              "dir": "/Users/someUser/Workspace/Repo/spi/spi-siwe-ear",
              "uri": "https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git",
              "http_url": "https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git",
              "owner": "SIWE",
              "repository": "siwe-siwe-ear",
              "pull_request": "99",
              "ref": "refs/pull/99/head",
              "branch_ref": "refs/pull/99/head"
           },
           "env": "build",
           "pr": "99",
           "cwd": "/Users/someUser/Workspace/Repo/spi/spi-siwe-ear"
        },
        "jiraUrl": "bwa.nrs.gov.bc.ca/int/jira",
        "bitbucketUrl": "https://bwa.nrs.gov.bc.ca/int/stash",
        "phase": "build"
     };
     return defaultSettings;
}    











