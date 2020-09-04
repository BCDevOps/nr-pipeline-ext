'use strict'
const Jira = require('./Jira')
const config = require(`${process.cwd()}/src/config.js`)

module.exports = class {
    constructor(settings) {
        this.settings = settings
    }

    async verifyBeforeDeployment() {
        // const env = config.options.env
        const jiraUrl = config.jiraUrl
        const username = config.phases.prod.credentials.idir.user
        const password = config.phases.prod.credentials.idir.pass
        const changeBranch = config.options.git.branch.merge
        let status = ''

        const key = changeBranch.split('-')
        const rfcIssueKey = key[0] + '-' + key[1]

        const jiraSettings = {
            url: jiraUrl,
            username: username,
            password: password,
            rfcIssueKey: rfcIssueKey,
        }

        // Create the jira object of the type Jira
        const jiraClient = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings }))
        const rfcIssue = await jiraClient.retrieveRfcIssueInfo(rfcIssueKey)
        const rfcStatus = rfcIssue.fields.status.name
        const rfdIssueLinks = []
        for (const i in rfcIssue.fields.issuelinks) {
            if (rfcIssue.fields.issuelinks[i].type.name === 'RFC-RFD') {
                rfdIssueLinks.push(rfcIssue.fields.issuelinks[i].outwardIssue.key)
            }
        }

        const mapRfdIssueStatus = new Map()
        for (const issue of rfdIssueLinks) {
            const rfdInfo = await jiraClient.getIssue(issue)
            if (rfdInfo.fields.customfield_10121.value.toLowerCase() === 'prod') {
                mapRfdIssueStatus.set(issue, rfdInfo.fields.status.name)
            }
        }

        if (
            Array.from(mapRfdIssueStatus.values()).every((val, arr) => val === 'Closed') &&
            rfcStatus.toLowerCase() === 'closed'
        ) {
            status = 'Ready'
        } else {
            status = 'Not Ready'
        }

        for (const [key, value] of Object.entries(mapRfdIssueStatus)) {
            console.log('\n---------------------------     CURRENT RFD PROD STATUS     ---------------------------\n')
            if (value.toLowerCase() !== 'closed') {
                console.log(
                    '=> Status of RFD:',
                    key,
                    'is currently ',
                    value,
                    '; ACTION REQUIRED: Close to continue merge'
                )
            } else {
                console.log('=> RFD:', key, ' is closed')
            }
        }

        console.log('\n---------------------------   RFC STATUS     ---------------------------\n')
        if (rfcStatus.toLowerCase() !== 'closed') {
            console.log(
                '=> Current RFC Status is',
                rfcStatus,
                ', ACTION REQUIRED: Close RFC',
                rfcIssueKey,
                'to continue Merge'
            )
        } else {
            console.log('=> RFC:', rfcIssueKey, 'is closed')
        }

        console.log(
            '\n--------------------------- STATUS OF READINESS CHECK FOR DEPLOYMENT  -----------------------------\n'
        )
        console.log('=>  ', status.toUpperCase(), '\n')
        return status
    }
}
