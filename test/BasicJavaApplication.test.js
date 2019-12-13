"use strict";
const expect = require("expect");
const assert = require("assert");
var sandbox = require('sinon').createSandbox();
const {OpenShiftClientX} = require('pipeline-cli');
const Jira = require('../lib/Jira');
const Git = require('../lib/GitVerification');
const BasicJavaApplicationBuilder = require('../lib/BasicJavaApplicationBuilder');

describe("BasicJavaApplication:", function() {
  this.timeout(50000);

  let ocApplyRecommendedLabelsStub;
  let ocApplyAndBuildStube;
  let gitObjStub;
  let jiraCreateRfdStub;

   // stubing
  this.beforeEach(function() {
    ocApplyRecommendedLabelsStub = sandbox.stub(OpenShiftClientX.prototype, 'applyRecommendedLabels');
    ocApplyAndBuildStube = sandbox.stub(OpenShiftClientX.prototype, 'applyAndBuild');
    gitObjStub = sandbox.stub(Git.prototype, 'verify');
    jiraCreateRfdStub = sandbox.stub(Jira.prototype, 'createRFD');
  });

  afterEach(function() {
    ocApplyRecommendedLabelsStub.restore();
    ocApplyAndBuildStube.restore();
    gitObjStub.restore();
    jiraCreateRfdStub.restore();
  });

  context("When target is a 'master'...", function() {
    it("It should call Jira createRFD, verify git is not out of sync, and applyAndBuild using oc", async function() {
      // Arrange
      const settingsStub = getDefaultSettings();
      settingsStub.options.git.change.target = "master";
      const builder = new BasicJavaApplicationBuilder(settingsStub);
      const processedTemplateStub = {processTemplates:"myTemplate"};
      sandbox.stub(builder, 'processTemplates').callsFake(() => processedTemplateStub);
      gitObjStub.returns(Promise.resolve('True')); // git verify passed.
  
      // Act
      const result = await builder.build();

      // Verify
      sandbox.assert.calledOnce(builder.processTemplates);
      sandbox.assert.calledOnce(jiraCreateRfdStub);
      sandbox.assert.calledOnce(gitObjStub);
      sandbox.assert.calledWith(gitObjStub,
        settingsStub.options.git.branch.merge,
        settingsStub.options.git.change.target,
        settingsStub.phases['build'].credentials.idir.user,
        settingsStub.phases['build'].credentials.idir.pass,
        settingsStub.options.git.url
      ); 
      sandbox.assert.calledOnce(ocApplyRecommendedLabelsStub);
      sandbox.assert.calledWith(ocApplyRecommendedLabelsStub,
        processedTemplateStub,
        settingsStub.phases[settingsStub.phase].name,
        settingsStub.phase,
        settingsStub.phases[settingsStub.phase].changeId,
        settingsStub.phases[settingsStub.phase].instance
      );
      sandbox.assert.calledOnce(ocApplyAndBuildStube);
      sandbox.assert.calledWith(ocApplyAndBuildStube, processedTemplateStub);
    });
  });
  
  context("When target is not a 'master'...", function() {
    it("when passing git 'verify'...it should applyAndBuild using oc", async function() {
      // Arrange
      const settingsStub = getDefaultSettings();
      settingsStub.options.git.change.target = "NOT_A_Master_Branch";
      const builder = new BasicJavaApplicationBuilder(settingsStub);
      const processedTemplateStub = {processTemplates:"myTemplate"};
      sandbox.stub(builder, 'processTemplates').callsFake(() => processedTemplateStub);
      gitObjStub.returns(Promise.resolve('True')); // git verify passed.
  
      // Act
      const result = await builder.build();
  
      // Verify
      sandbox.assert.calledOnce(builder.processTemplates);
      sandbox.assert.notCalled(jiraCreateRfdStub);
      sandbox.assert.calledOnce(gitObjStub);
      sandbox.assert.calledWith(gitObjStub,
        settingsStub.options.git.branch.merge,
        settingsStub.options.git.change.target,
        settingsStub.phases['build'].credentials.idir.user,
        settingsStub.phases['build'].credentials.idir.pass,
        settingsStub.options.git.url
      ); 
      sandbox.assert.calledOnce(ocApplyRecommendedLabelsStub);
      sandbox.assert.calledWith(ocApplyRecommendedLabelsStub,
        processedTemplateStub,
        settingsStub.phases[settingsStub.phase].name,
        settingsStub.phase,
        settingsStub.phases[settingsStub.phase].changeId,
        settingsStub.phases[settingsStub.phase].instance
      );
      sandbox.assert.calledOnce(ocApplyAndBuildStube);
      sandbox.assert.calledWith(ocApplyAndBuildStube, processedTemplateStub);
    });
  });
   
  it.skip("Throw error, when no target branch defined from calling this module...", function() {

  });

  function getDefaultSettings() {
    const defaultSettings = {
      "phases": {
        "build": {
          "namespace": "wp9gel-tools",
          "changeId": "99",
          "instance": "siwe-build-99",
          "credentials": {
            "idir": {
              "user": "NRCDA001@gov.bc.ca",
              "pass": "b8ufIzsz2oHWxZ"
            }
          }
        },
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
          }
        },
        "env": "build",
        "pr": "99",
        "cwd": "/Users/iliu/Workspace/Repo/spi/spi-siwe-ear"
      },
      "jiraUrl": "bwa.nrs.gov.bc.ca/int/jira",
      "bitbucketUrl": "https://bwa.nrs.gov.bc.ca/int/stash",
      "phase": "build"
    };
    return defaultSettings;
  }
});

