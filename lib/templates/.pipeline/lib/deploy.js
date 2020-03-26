'use strict'

const { BasicJavaApplicationDeployer } = require('nr-pipeline-ext')
const path = require('path')
const fs = require('fs')
const config = require(`${process.cwd()}/lib/config.js`)
const env = config.options.env
const pvcSize = '5Gi'

const MyDeployer = class extends BasicJavaApplicationDeployer {
    processTemplates(oc) {
        const phase = env
        const phases = this.settings.phases
        const objects = []
        const templatesLocalBaseUrl = oc.toFileUrl(path.resolve(__dirname, '../../openshift'))

        objects.push(
            ...oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/deploy.yaml`, {
                param: {
                    NAME: phases[phase].name,
                    SUFFIX: phases[phase].suffix,
                    VERSION: phases[phase].tag,
                    HOST: phases[phase].host,
                    APPDATA_PVC_SIZE: phases[phase].appDataPvSize,
                    LOG_PVC_SIZE: phases[phase].logPvSize,
                },
            })
        )

        return objects
    }
}

module.exports = async settings => {
    await new MyDeployer(settings).deploy()
}
