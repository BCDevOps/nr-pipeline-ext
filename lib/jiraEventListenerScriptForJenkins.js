'use strict'
const Verifier = require('./InputDeployerVerify')
const settings = require(`${process.cwd()}/lib/config.js`)

;(async () => {
    const verify = new Verifier(Object.assign(settings))
    await verify.verifyBeforeDeployment()
})()
