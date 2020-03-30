'use strict'
const settings = require(`${process.cwd()}/config/index.js`)

const BasicJavaApplicationClean = require('./BasicJavaApplicationClean')

;(async () => {
    await new BasicJavaApplicationClean(settings).clean()
})()
