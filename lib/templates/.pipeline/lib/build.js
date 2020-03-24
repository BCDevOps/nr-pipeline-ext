'use strict';

const {BasicJavaApplicationBuilder} = require('nr-pipeline-ext');
const path = require('path');
const fs = require('fs')

const MyBuilder = class extends BasicJavaApplicationBuilder {
  processTemplates(oc){
    const phase = 'build';
    const phases = this.settings.phases
    const OPENJDK18_IMAGE_TAG = '1.6-23';
    const HTTPD_IMAGE_NAME = 'httpd-24-rhel7';
    const HTTPD_IMAGE_TAG = '2.4';
    const objects = [];
    const templatesLocalBaseUrl = oc.toFileUrl(path.resolve(__dirname, '../../openshift'));

    objects.push(... oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/base-openjdk18-openshift-build.yaml`, {
      'param':{
        'IMAGE_TAG': OPENJDK18_IMAGE_TAG,
      }
    }));
    

    const mvnSettings = oc.get('secret/mvn-settings')[0];
    for (let fileName of Object.keys(mvnSettings.data)){
      const filePath = path.resolve(__dirname, `../../docker/base-openjdk18-openshift/contrib/${fileName}`);
      fs.writeFileSync(
        filePath, 
        Buffer.from(mvnSettings.data[fileName], 'base64').toString('utf-8'),
        {encoding:'utf8'}
      );
    }

    objects.push(... oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/base-tomcat9-ha-build.yaml`, {
    }));
    

    objects.push(... oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/irs-build.yaml`, {
      'param':{
        'NAME': phases[phase].name,
        'SUFFIX': phases[phase].suffix,
        'VERSION': phases[phase].tag,
        'SOURCE_GIT_URL': oc.git.http_url,
        'SOURCE_GIT_REF': oc.git.branch.merge,
        'OPENJDK18_IMAGE_TAG': OPENJDK18_IMAGE_TAG,
      }
    }));
    return objects;
  }
}

module.exports = async (settings) => {
  await new MyBuilder(settings).build();
}