'use strict'
const { OpenShiftClientX } = require('@bcgov/pipeline-cli')
const Jira = require('./Jira')
const Verifier = require('./InputDeployerVerify')

module.exports = class {
    constructor(settings) {
        this.settings = settings
    }

    /**
     * returns an array on openshift resources
     */
    processTemplates(oc) {}

    async deploy() {
        const env = this.settings.options.env

        if (this.settings.options['local-mode'] === 'true') {
            await this.deployOpenshift()
        } else {
            const verify = new Verifier(this.settings)
            const verifyStatus = await verify.verifyBeforeDeployment()

            if (verifyStatus.status === 'Ready') {
                await this.deployOpenshift()
                const jiraUrl = this.settings.jiraUrl
                const username = this.settings.phases[env].credentials.idir.user
                const password = this.settings.phases[env].credentials.idir.pass
                const changeBranch = this.settings.options.git.branch.merge
                const key = changeBranch.split('-')
                const rfcIssueKey = key[0] + '-' + key[1]

                const jiraSettings = {
                    url: jiraUrl,
                    username: username,
                    password: password,
                    rfcIssueKey: rfcIssueKey,
                }
                // Create the jira object of the type Jira
                const jira = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings }))
                return jira.transitionRFDpostDeployment(env)
            } else {
                throw new Error(
                    '\n ----------------------------------------------------- \n Not Ready for Deployment, Check the Jira Statuses to know what you need to do \n -----------------------------------------------------'
                )
            }
        }
    }

    async deployOpenshift() {
        const settings = this.settings
        const phases = settings.phases
        const options = settings.options
        const phase = settings.options.env
        const changeId = phases[phase].changeId
        const oc = new OpenShiftClientX(Object.assign({ namespace: phases[phase].namespace }, options))
        const objects = this.processTemplates(oc)

        oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
        oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
        return oc.applyAndDeploy(objects, phases[phase].instance)
    }
}
