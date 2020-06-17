'use strict'
const Jira = require('../lib/Jira')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()
const nock = require('nock')
const expect = require('expect')
const toMatchSnapshot = require('./expect-mocha-snapshot')
expect.extend({ toMatchSnapshot })

const RFDWORKFLOW = require('../lib/JiraRfdWorkflowV1.2')
const RFCWORKFLOW = require('../lib/JiraRfcWorkflowV1.2.1')
const CONST = require('../lib/constants')

const WORKFLOWS = { RFD: RFDWORKFLOW, RFC: RFCWORKFLOW, 'RFD-subtask': RFDWORKFLOW }

const JIRA_SETTINGS = {
    url: 'bwa.nrs.gov.bc.ca/int/jira',
    username: 'fake',
    password: 'fake',
    rfcIssueKey: 'FAKE-123',
    changeBranch: 'FAKE-123-rfc',
    branchName: 'PR-456',
    repoName: 'FAKE',
    projectName: 'FAKE',
    version: '1.0.0',
}

class JiraMock {
    constructor(jira) {
        this.issues = new Map()
        this.links = []
        this.lastIssueId = 1000
        this.jira = jira
    }

    _getIssue(issueKey) {
        const issue = Object.assign({}, this.issues.get(issueKey))
        issue.fields = Object.assign({}, issue.fields)
        const resolvedIssueLinks = []
        for (const issueLink of issue.fields.issuelinks) {
            const newIssueLink = Object.assign({}, issueLink)
            if (!newIssueLink.inwardIssue.fields) {
                newIssueLink.inwardIssue = Object.assign({}, this.issues.get(issueLink.inwardIssue.key))
                newIssueLink.inwardIssue.fields = Object.assign({}, newIssueLink.inwardIssue.fields)
                delete newIssueLink.inwardIssue.fields.issuelinks
                delete newIssueLink.inwardIssue.fields.subtasks
            }
            if (!newIssueLink.outwardIssue.fields) {
                newIssueLink.outwardIssue = Object.assign({}, this.issues.get(issueLink.outwardIssue.key))
                newIssueLink.outwardIssue.fields = Object.assign({}, newIssueLink.outwardIssue.fields)
                delete newIssueLink.outwardIssue.fields.issuelinks
                delete newIssueLink.outwardIssue.fields.subtasks
            }
            resolvedIssueLinks.push(newIssueLink)
        }
        issue.fields.issuelinks = resolvedIssueLinks
        return issue
    }

    _linkIssues(link) {
        const self = this
        self.links.push(link)
        const issue1 = self.issues.get(link.inwardIssue.key)
        issue1.fields.issuelinks = issue1.fields.issuelinks || []
        // link.inwardIssue = issue1
        issue1.fields.issuelinks.push(link)
        const issue2 = self.issues.get(link.outwardIssue.key)
        issue2.fields.issuelinks = issue2.fields.issuelinks || []
        // link.outwardIssue = issue2
        issue2.fields.issuelinks.push(link)
        return link
    }

    _addIssue(issue) {
        if (Array.isArray(issue)) {
            for (const iss of issue) {
                this._addIssue(iss)
            }
            return issue
        }
        issue.fields = issue.fields || {}
        issue.fields.subtasks = issue.fields.subtasks || []
        issue.fields.issuelinks = issue.fields.issuelinks || []
        this.issues.set(issue.key, issue)
        return issue
    }

    start() {
        const self = this
        nock('https://bwa.nrs.gov.bc.ca:443', { encodedQueryParams: true })
            .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+$/)
            .reply(200, (uri, requestBody) => {
                const issueKey = uri.split('/')[7]
                const serializableIssue = this._getIssue(issueKey)
                // console.log(JSON.stringify(serializableIssue))
                return serializableIssue
            })
            .persist()
        nock('https://bwa.nrs.gov.bc.ca:443', { encodedQueryParams: true })
            .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+\/transitions$/)
            .reply(200, (uri, requestBody) => {
                const issueKey = uri.split('/')[7]
                const issue = self.issues.get(issueKey)
                const workflow = WORKFLOWS[issue.fields.issuetype.name]
                const transitions = {
                    expand: 'transitions',
                    transitions: workflow.getTransitionsByStatusId(issue.fields.status.id),
                }
                return transitions
            })
            .persist()
        nock('https://bwa.nrs.gov.bc.ca:443', { encodedQueryParams: true })
            .post(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+\/transitions$/)
            .reply(200, (uri, requestBody) => {
                const issueKey = uri.split('/')[7]
                const issue = self.issues.get(issueKey)
                const workflow = WORKFLOWS[issue.fields.issuetype.name]
                const newTransition = workflow.getTransitionById(requestBody.transition.id)
                Object.assign(issue.fields.status, newTransition.to)
            })
            .persist()

        nock('https://bwa.nrs.gov.bc.ca')
            .get('/int/jira/rest/api/2/project/FAKE')
            .reply(200, {
                components: [{ name: 'FAKE' }],
            })
            .persist()
        nock('https://bwa.nrs.gov.bc.ca')
            .post('/int/jira/rest/api/2/issue')
            .reply(200, (uri, requestBody) => {
                const newIssue = Object.assign({}, requestBody)
                newIssue.fields = newIssue.fields || {}
                newIssue.fields.status = newIssue.fields.status || { ...RFDWORKFLOW.INITIAL_STATUS }
                const newId = self.lastIssueId++
                newIssue.key = `FAKE-${newId}`
                self._addIssue(newIssue)
                return newIssue
            })
            .persist()

        nock('https://bwa.nrs.gov.bc.ca')
            .post('/int/jira/rest/api/2/issueLink')
            .reply(200, (uri, requestBody) => {
                return this._linkIssues(requestBody)
            })
            .persist()
    }
}
describe('Jira @jira', function() {
    beforeEach('Using fake settings to create JIRA object', function() {
        if (!nock.isActive()) {
            nock.activate()
        }
        nock.disableNetConnect()
    })
    afterEach('Completely restore all fakes created through the sandbox', function() {
        sandbox.restore()
        nock.restore()
        nock.cleanAll()
    })
    describe('RFDs and RFD-Subtasks', function() {
        it('create', async function() {
            const jira = new Jira(Object.assign({}, { phase: 'jira-update', jira: JIRA_SETTINGS }))
            const jiraMock = new JiraMock(jira)
            // RFC already exists
            jiraMock._addIssue({
                key: 'FAKE-123',
                fields: {
                    fixVersions: ['0.0.0'],
                    issuetype: { id: '10400', name: 'RFC' },
                },
            })
            jiraMock.start()

            await expect(jira.createRFD()).resolves.toBe(true)
            expect(Array.from(jiraMock.issues.values())).toHaveLength(7)
            // console.dir(Array.from(issues.values()), { depth: 4 })
            expect(Array.from(jiraMock.issues.values())).toMatchSnapshot(this, 'a7c66bfb-a011-4adc-9b10-6dda737a2d5b')
            expect(jiraMock.links).toHaveLength(3)
            // console.dir(links)
            expect(jiraMock.links).toMatchSnapshot(this, '72829b90-f2e8-4569-92d8-10a7c889c8cc')
        })
        it('update', async function() {
            const initialState = [
                {
                    key: 'FAKE-123',
                    fields: {
                        fixVersions: ['0.0.0'],
                        issuetype: { id: '10400', name: 'RFC' },
                        status: RFCWORKFLOW.STATUS_AUTHORIZED_FOR_PROD,
                        issuelinks: [
                            {
                                inwardIssue: { key: 'FAKE-123' },
                                outwardIssue: { key: 'FAKE-1000' },
                                type: { id: '10300' },
                            },
                            {
                                inwardIssue: { key: 'FAKE-123' },
                                outwardIssue: { key: 'FAKE-1002' },
                                type: { id: '10300' },
                            },
                            {
                                inwardIssue: { key: 'FAKE-123' },
                                outwardIssue: { key: 'FAKE-1004' },
                                type: { id: '10300' },
                            },
                        ],
                    },
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD' },
                        customfield_10121: { value: 'DLVR' },
                        labels: ['FAKE', 'auto'],
                        fixVersions: [{}],
                        description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
                        summary: 'RFD-DLVR-FAKE-123-rfc-PR-456',
                        status: RFDWORKFLOW.STATUS_RESOLVED,
                    },
                    key: 'FAKE-1000',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD-subtask' },
                        customfield_10121: { value: 'DLVR' },
                        parent: { key: 'FAKE-1000' },
                        summary: 'RFD-Subtask-DLVR-FAKE-123-rfc-PR-456-Developer-Review',
                        components: [{ name: 'FAKE' }],
                        status: RFDWORKFLOW.STATUS_RESOLVED,
                    },
                    key: 'FAKE-1001',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD' },
                        customfield_10121: { value: 'TEST' },
                        labels: ['FAKE', 'auto'],
                        fixVersions: [{}],
                        description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
                        summary: 'RFD-TEST-FAKE-123-rfc-PR-456',
                        status: RFDWORKFLOW.STATUS_RESOLVED,
                    },
                    key: 'FAKE-1002',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD-subtask' },
                        customfield_10121: { value: 'TEST' },
                        parent: { key: 'FAKE-1002' },
                        summary: 'RFD-Subtask-TEST-FAKE-123-rfc-PR-456-IIT-Review',
                        components: [{ name: 'FAKE' }],
                        status: RFDWORKFLOW.STATUS_RESOLVED,
                    },
                    key: 'FAKE-1003',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD' },
                        customfield_10121: { value: 'PROD' },
                        labels: ['FAKE', 'auto'],
                        fixVersions: [{}],
                        description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
                        summary: 'RFD-PROD-FAKE-123-rfc-PR-456',
                        status: RFDWORKFLOW.STATUS_RESOLVED,
                    },
                    key: 'FAKE-1004',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD-subtask' },
                        customfield_10121: { value: 'PROD' },
                        parent: { key: 'FAKE-1004' },
                        summary: 'RFD-Subtask-PROD-FAKE-123-rfc-PR-456-Business-Review',
                        components: [{ name: 'FAKE' }],
                        status: RFDWORKFLOW.STATUS_RESOLVED,
                    },
                    key: 'FAKE-1005',
                },
            ]
            const jira = new Jira(Object.assign({}, { phase: 'jira-update', jira: JIRA_SETTINGS }))
            const jiraMock = new JiraMock(jira)
            jiraMock.start()
            jiraMock._addIssue(initialState)
            await expect(jira.createRFD()).resolves.toBe(true)
            // console.dir(JSON.stringify(Array.from(jiraMock.issues.values())))
            await expect(Array.from(jiraMock.issues.values())).toMatchSnapshot(
                this,
                '3e7704c4-f8d6-44f5-8473-4c7a0c094633'
            )

            await jira.transitionRFDpostDeployment(CONST.ENV.DLVR)
            await jira.transitionRFDpostDeployment(CONST.ENV.TEST)
            await jira.transitionRFDpostDeployment(CONST.ENV.PROD)
        })
    })
})
