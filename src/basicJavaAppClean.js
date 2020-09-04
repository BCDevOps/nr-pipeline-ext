'use strict'
const settings = require(`${process.cwd()}/lib/config.js`)
const BasicJavaApplicationClean = require('./BasicJavaApplicationClean')

new BasicJavaApplicationClean(settings).clean()
