'use strict'

const Jira = require('../lib/Jira')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()
const nock = require('nock')
const expect = require('expect')
const RfdWorkflow = require('../lib/JiraRfdWorkflowV1.2')
const RfcWorkflow = require('../lib/JiraRfcWorkflowV1.2.1')

const WORKFLOWS = { RFD: RfdWorkflow, RFC: RfcWorkflow, 'RFD-subtask': RfdWorkflow }

let jira = null
describe('Jira', function() {
    beforeEach('Using fake settings to create JIRA object', function() {
        nock.disableNetConnect()
        // nock.recorder.rec()
        const jiraSettings = {
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
        // Create the jira object of the type Jira
        jira = new Jira(Object.assign({}, { phase: 'jira-update', jira: jiraSettings }))
        // nock.activate();
    })
    afterEach('Completely restore all fakes created through the sandbox', function() {
        sandbox.restore()
        nock.restore()
    })
    describe('RFD', function() {
        it.only('should throw error @jira #unit', async function() {
            const issues = new Map()
            const links = []
            let lastIssueId = 1000

            // RFC already exists
            issues.set('FAKE-123', {
                key: 'FAKE-123',
                fields: {
                    fixVersions: ['0.0.0'],
                    issuetype: { id: '10400', name: 'RFC' },
                },
            })

            nock('https://bwa.nrs.gov.bc.ca:443', { encodedQueryParams: true })
                .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+$/)
                .reply(200, (uri, requestBody) => {
                    const issueKey = uri.split('/')[7]
                    return issues.get(issueKey)
                })
                .persist()

            nock('https://bwa.nrs.gov.bc.ca:443', { encodedQueryParams: true })
                .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+\/transitions$/)
                .reply(200, (uri, requestBody) => {
                    const issueKey = uri.split('/')[7]
                    const issue = issues.get(issueKey)
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
                    const issue = issues.get(issueKey)
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
                    newIssue.fields.status = newIssue.fields.status || { ...RfdWorkflow.INITIAL_STATUS }
                    const newId = lastIssueId++
                    newIssue.key = `FAKE-${newId}`
                    issues.set(newIssue.key, newIssue)
                    return newIssue
                })
                .persist()

            nock('https://bwa.nrs.gov.bc.ca')
                .post('/int/jira/rest/api/2/issueLink')
                .reply(200, (uri, requestBody) => {
                    links.push(requestBody)
                    return requestBody
                })
                .persist()

            await expect(jira.createRFD()).resolves.toBe(true)
            expect(Array.from(issues.values())).toHaveLength(7)
            // console.dir(Array.from(issues.values()), { depth: 4 })
            expect(Array.from(issues.values())).toStrictEqual([
                {
                    key: 'FAKE-123',
                    fields: {
                        fixVersions: ['0.0.0'],
                        issuetype: { id: '10400', name: 'RFC' },
                    },
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD' },
                        customfield_10121: {},
                        labels: ['FAKE', 'auto'],
                        fixVersions: [{}],
                        description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
                        summary: 'RFD-undefined-FAKE-123-rfc-PR-456',
                        status: { id: '10316', name: 'Submitted' },
                    },
                    key: 'FAKE-1000',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD-subtask' },
                        customfield_10121: {},
                        parent: { key: 'FAKE-1000' },
                        summary: 'RFD-Subtask-undefined-FAKE-123-rfc-PR-456-undefined-Review',
                        components: [{ name: 'FAKE' }],
                        status: { id: '10316', name: 'Submitted' },
                    },
                    key: 'FAKE-1001',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD' },
                        customfield_10121: {},
                        labels: ['FAKE', 'auto'],
                        fixVersions: [{}],
                        description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
                        summary: 'RFD-undefined-FAKE-123-rfc-PR-456',
                        status: { id: '10316', name: 'Submitted' },
                    },
                    key: 'FAKE-1002',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD-subtask' },
                        customfield_10121: {},
                        parent: { key: 'FAKE-1002' },
                        summary: 'RFD-Subtask-undefined-FAKE-123-rfc-PR-456-undefined-Review',
                        components: [{ name: 'FAKE' }],
                        status: { id: '10316', name: 'Submitted' },
                    },
                    key: 'FAKE-1003',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD' },
                        customfield_10121: {},
                        labels: ['FAKE', 'auto'],
                        fixVersions: [{}],
                        description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
                        summary: 'RFD-undefined-FAKE-123-rfc-PR-456',
                        status: { id: '10316', name: 'Submitted' },
                    },
                    key: 'FAKE-1004',
                },
                {
                    fields: {
                        project: { key: 'FAKE' },
                        issuetype: { name: 'RFD-subtask' },
                        customfield_10121: {},
                        parent: { key: 'FAKE-1004' },
                        summary: 'RFD-Subtask-undefined-FAKE-123-rfc-PR-456-undefined-Review',
                        components: [{ name: 'FAKE' }],
                        status: { id: '10316', name: 'Submitted' },
                    },
                    key: 'FAKE-1005',
                },
            ])
        })
    })
})
