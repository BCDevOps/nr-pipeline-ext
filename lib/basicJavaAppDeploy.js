const BasicJavaApplicationDeployer = require('./BasicJavaApplicationDeployer')
const path = require('path')
const settings = require(`${process.cwd()}/lib/config.js`)
const env = settings.options.env

const MyDeployer = class extends BasicJavaApplicationDeployer {
    processTemplates(oc) {
        const phase = env
        const phases = this.settings.phases
        const objects = []
        const templatesLocalBaseUrl = oc.toFileUrl(path.resolve(`${process.cwd()}`, '../openshift'))
        const commonParams = {
            NAME: phases[phase].name,
            SUFFIX: phases[phase].suffix,
            VERSION: phases[phase].tag,
            HOST: phases[phase].host,
            APPDATA_PVC_SIZE: phases[phase].appDataPvSize,
            LOG_PVC_SIZE: phases[phase].logPvSize,
            WEBAPP_NAME: this.settings.webappName,
            ROUTE_PATH: this.settings.routePath,
            ENV_PROXY_HOST: phases[phase].envProxyHost,
            INDEX: this.settings.index,
        }
        const finalParams = Object.assign(commonParams, this.settings.buildParams)
        objects.push(
            ...oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/deploy.yaml`, {
                param: finalParams,
            })
        )

        return objects
    }
}

;(async () => {
    await new MyDeployer(settings).deploy()
})()
