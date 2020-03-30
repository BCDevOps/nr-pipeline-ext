'use strict'
const settings = require(`${process.cwd()}/lib/config.js`)

const BasicJavaApplicationClean = require('./BasicJavaApplicationClean')

;(async () => {
    await new BasicJavaApplicationClean(settings).clean()
})()
