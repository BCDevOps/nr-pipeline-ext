"use strict";
const expect = require("expect");
var sandbox = require('sinon').createSandbox();
const {OpenShiftClientX} = require('pipeline-cli');
const Jira = require('../lib/Jira');
const Verifier = require('./InputDeployerVerify');
const BasicJavaApplicationBuilder = require('../lib/BasicJavaApplicationDeployer');

describe("BasicJavaApplicationBuilder:", function() {
  this.timeout(50000);

  let ocApplyRecommendedLabelsStub;
  let ocApplyAndBuildStube;
  let verifyBeforeDeploymentStub;
  let jiraTransitionRFDpostDeploymentStub;

   // stubing
  this.beforeEach(function() {
    ocApplyRecommendedLabelsStub = sandbox.stub(OpenShiftClientX.prototype, 'applyRecommendedLabels');
    ocApplyAndBuildStube = sandbox.stub(OpenShiftClientX.prototype, 'applyAndBuild');
    verifyBeforeDeploymentStub = sandbox.stub(Verifier.prototype, 'verifyBeforeDeployment');
    jiraTransitionRFDpostDeploymentStub = sandbox.stub(Jira.prototype, 'transitionRFDpostDeployment');
  });

  afterEach(function() {
    ocApplyRecommendedLabelsStub.restore();
    ocApplyAndBuildStube.restore();
    verifyBeforeDeploymentStub.restore();
    jiraTransitionRFDpostDeploymentStub.restor();
  });


});

