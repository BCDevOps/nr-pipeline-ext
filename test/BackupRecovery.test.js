"use strict";
const expect = require("expect");
const sinon = require("sinon");
const sandbox = sinon.createSandbox();
const BackupRecovery = require('../lib/BackupRecovery');
const {DB_ACTION} = require('../lib/constants');
const utileFunctions = require('../lib/util-functions');

// root-level hooks below (for all test files)
const commonSettings = {
   "git.branch.merge": "sample-issue-fake-branch",
   "env": "sbox",
   "namespace": "fake_namespace",
   "pr": "1"
};
let backupRecovery = null;

beforeEach("Using fake settings to create BackupRecovery object", function() {
   backupRecovery = new BackupRecovery(commonSettings);
});

afterEach("Completely restore all fakes created through the sandbox", function() {
   sandbox.restore();
});

describe("BackupRecovery - doBackupOrRecovery", function() {
   let createScriptSecretStub;
   let getOverrideStub;
   let ocRunSqlclWithOverrideStub;

   beforeEach(function() {
      createScriptSecretStub = sandbox.stub(backupRecovery, 'createBackupRecoveryScriptSecret');
      getOverrideStub = sandbox.stub(backupRecovery, '_getOverride');
      ocRunSqlclWithOverrideStub = sandbox.stub(backupRecovery, '_handleOcRunSqlclWithOverride');
   })

   it("Backup once successfully", async function() {
      const op = DB_ACTION.BACKUP;
      const schemaList = ['CWI_SPI_DC','CWI_TXN'];

      createScriptSecretStub.callsFake(() => Promise.resolve('fakeScriptSecretName'));
      getOverrideStub.callsFake(() => { return {spec: {}}; });
      ocRunSqlclWithOverrideStub.callsFake(() => Promise.resolve({exitCode: 0}));

      const result = await backupRecovery.doBackupOrRecovery(op, schemaList);

      expect(createScriptSecretStub.calledOnce).toBe(true);
      expect(getOverrideStub.calledOnce).toBe(true);
      expect(result.exitCode).toBe(0);
   })

   it("Subsequent Backup with the same settings and PR, finished successfully", async function() {
      const op = DB_ACTION.BACKUP;
      const schemaList = ['CWI_SPI_DC','CWI_TXN'];

      createScriptSecretStub.callsFake(() => Promise.resolve('fakeScriptSecretName'));
      getOverrideStub.callsFake(() => { return {spec: {}}; });
      ocRunSqlclWithOverrideStub.onFirstCall().returns(Promise.resolve({exitCode: 0}));
      ocRunSqlclWithOverrideStub.onSecondCall().returns(Promise.resolve({exitCode: 0}));

      // call twice
      const result1 = await backupRecovery.doBackupOrRecovery(op, schemaList);
      const result2 = await backupRecovery.doBackupOrRecovery(op, schemaList);

      sinon.assert.calledTwice(createScriptSecretStub);
      sinon.assert.calledTwice(getOverrideStub);
      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      sinon.assert.calledWith(createScriptSecretStub, sinon.match({namespace: commonSettings.namespace, op, schemaList}))
   })
});


