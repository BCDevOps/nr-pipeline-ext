'use strict';
const Jira = require('./Jira');
const Verifier = require('./InputDeployerVerify');
const settings = require(`${process.cwd()}/lib/config.js`);

(async () => {
const verify=new Verifier(Object.assign(settings));
const verifyStatus = await verify.verifyBeforeDeployment();
})();