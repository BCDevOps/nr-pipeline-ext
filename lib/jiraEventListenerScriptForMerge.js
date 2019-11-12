'use strict';
const Jira = require('./Jira');
const Verifier = require('./InputMergePR');
const settings = require(`${process.cwd()}/lib/config.js`);

(async () => {
const verify=new Verifier(Object.assign(settings));
const verifyStatus = await verify.verifyBeforeDeployment();
})();