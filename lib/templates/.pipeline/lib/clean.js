'use strict';

const {BasicJavaApplicationClean} = require('nr-pipeline-ext');

module.exports = async (settings) => {
  await new BasicJavaApplicationClean(settings).clean();
}