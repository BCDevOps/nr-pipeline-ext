const BasicJavaApplicationBuilder = require('./BasicJavaApplicationBuilder.js')
const path = require('path')
const settings = require(`${process.cwd()}/lib/config.js`)

const MyBuilder = class extends BasicJavaApplicationBuilder {
    processTemplates(oc) {
        const phase = 'build'
        const phases = this.settings.phases
        const objects = []
        const templatesLocalBaseUrl = oc.toFileUrl(path.resolve(`${process.cwd()}`, '../openshift'))

        objects.push(
            ...oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/build.yaml`, {
                param: {
                    NAME: phases[phase].name,
                    SUFFIX: phases[phase].suffix,
                    VERSION: phases[phase].tag,
                    SOURCE_GIT_URL: oc.git.http_url,
                    SOURCE_GIT_REF: oc.git.branch.merge,
                    OPENJDK18_IMAGE_TAG: this.settings.openjdkImageTag,
                    OPENJDK18_IMAGE_NAME: this.settings.openjdkImageName,
                    TOMCAT_IMAGE_TAG: this.settings.tomcatImageTag,
                    TOMCAT_IMAGE_NAME: this.settings.tomcatImageName,
                    WEBAPP_NAME: this.settings.webappName,
                    ARTIFACT_ID: this.settings.artifactId,
                    PACKAGING_TYPE: this.settings.packagingType,
                    ARTIFACT_VERSION: this.settings.artifactVersion,
                },
            })
        )
        return objects
    }
}

;(async () => {
    await new MyBuilder(settings).build()
})()
