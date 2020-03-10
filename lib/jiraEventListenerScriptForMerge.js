'use strict'
const Verifier = require('./InputMergePR')
const settings = require(`${process.cwd()}/lib/config.js`);

(async () => {
  const verify = new Verifier(Object.assign(settings))
  await verify.verifyBeforeDeployment()
})()
