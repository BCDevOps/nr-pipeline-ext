const BasicJavaApplicationBuilder = require('./BasicJavaApplicationBuilder.js')
const path = require('path')
const settings = require(`${process.cwd()}/src/config.js`)

const MyBuilder = class extends BasicJavaApplicationBuilder {
    processTemplates(oc) {
        const phase = 'build'
        const phases = this.settings.phases
        const objects = []
        const templatesLocalBaseUrl = oc.toFileUrl(path.resolve(`${process.cwd()}`, '../openshift'))
        const commonParams = {
            NAME: phases[phase].name,
            SUFFIX: phases[phase].suffix,
            VERSION: phases[phase].tag,
            SOURCE_GIT_URL: oc.git.http_url,
            SOURCE_GIT_REF: oc.git.branch.merge,
        }
        const finalParams = Object.assign(commonParams, this.settings.buildParams)
        objects.push(
            ...oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/build.yaml`, {
                param: finalParams,
            })
        )
        return objects
    }
}

new MyBuilder(settings).build()
