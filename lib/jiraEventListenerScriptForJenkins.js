'use strict'
const Verifier = require('./InputDeployerVerify')
const settings = require(`${process.cwd()}/config/index.js`)

;(async () => {
    const verify = new Verifier(Object.assign(settings))
    await verify.verifyBeforeDeployment()
})()
