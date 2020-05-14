'use strict'
const Verifier = require('./InputMergePR')
const settings = require(`${process.cwd()}/lib/config.js`)
const verify = new Verifier(Object.assign(settings))
verify.verifyBeforeDeployment()
