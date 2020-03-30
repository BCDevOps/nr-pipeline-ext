'use strict'
const Verifier = require('./InputMergePR')
const settings = require(`${process.cwd()}/config/index.js`)

;(async () => {
    const verify = new Verifier(Object.assign(settings))
    await verify.verifyBeforeDeployment()
})()
