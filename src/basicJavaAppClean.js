'use strict'
const settings = require(`${process.cwd()}/src/config.js`)
const BasicJavaApplicationClean = require('./BasicJavaApplicationClean')

new BasicJavaApplicationClean(settings).clean()
