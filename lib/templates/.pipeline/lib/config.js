'use strict'
const options = require('pipeline-cli').Util.parseArguments()
const { OpenShiftClient } = require('pipeline-cli')
const changeId = options.pr //aka pull-request
const version = '1.0'
const name = ''

const jiraUrl = 'bwa.nrs.gov.bc.ca/int/jira'
const bitbucketUrl = 'https://bwa.nrs.gov.bc.ca/int/stash'
const routePath = ''
const index = ''
const buildParams = {
    OPENJDK18_IMAGE_TAG: '1.6-23',
    OPENJDK18_IMAGE_NAME: 'openjdk18-openshift',
    TOMCAT_IMAGE_TAG: '9.0.30',
    TOMCAT_IMAGE_NAME: 'ha-tomcat9',
    WEBAPP_NAME: '',
    ARTIFACT_ID: '',
    PACKAGING_TYPE: '',
    ARTIFACT_VERSION: '',
}
const deployParams = {}
Object.assign(options.git, { owner: '', repository: '' })
const namespace = { build: '', dev: '', dlvr: '', test: '', prod: '' }

const phases0 = {
    namespace,
    name: { build: `${name}`, dev: `${name}`, dlvr: `${name}`, test: `${name}`, prod: `${name}` },
    appDataPvSize: { build: '', dev: '1Gi', dlvr: '500Mi', test: '500Mi', prod: '40Gi' },
    logPvSize: { build: '', dev: '1Gi', dlvr: '500Mi', test: '500Mi', prod: '1Gi' },
    phase: { build: 'build', dev: 'dev', dlvr: 'dev', test: 'test', prod: 'prod' },
    changeId: { build: changeId, dev: changeId, dlvr: changeId, test: changeId, prod: changeId },
    suffix: { build: `-build-${changeId}`, dev: `-dev-${changeId}`, dlvr: `-dlvr`, test: `-test`, prod: `-prod` },
    tag: {
        build: `build-${version}-${changeId}`,
        dev: `dev-${version}-${changeId}`,
        dlvr: `dlvr-${version}`,
        test: `test-${version}`,
        prod: `prod-${version}`,
    },
    instance: {
        build: `${name}-build-${changeId}`,
        dev: `${name}-dev-${changeId}`,
        dlvr: `${name}-dlvr`,
        test: `${name}-test`,
        prod: `${name}-prod-${changeId}`,
    },
    transient: { build: true, dev: true, dlvr: false, test: false, prod: false },
    host: {
        build: '',
        dev: `${name}-dev-${changeId}-${namespace.dev}.pathfinder.gov.bc.ca`,
        dlvr: `delivery.a100.gov.bc.ca`,
        test: `test.a100.gov.bc.ca`,
        prod: `${name}-prod-${namespace.prod}.pathfinder.gov.bc.ca`,
    },
    envProxyHost: {
        build: '',
        dev: '',
        dlvr: 'delivery.a100.gov.bc.ca',
        test: 'test.a100.gov.bc.ca',
        prod: `a100.gov.bc.ca`,
    },
}
const idirCredential = {}
const credentials = {}

const idirSecret = new OpenShiftClient({ namespace: namespace.build }).get('secret/bitbucket-account')[0]
idirCredential['user'] = Buffer.from(idirSecret.data.username, 'base64').toString('utf-8')
idirCredential['pass'] = Buffer.from(idirSecret.data.password, 'base64').toString('utf-8')

for (let envName of Object.keys(namespace)) {
    credentials[envName] = { idir: idirCredential }
}

Object.assign(phases0, { credentials })
const phases = {}
// Pivot configuration table, so that `phase name` becomes a top-level property
// { namespace: { build: '-tools',  dev: '-dev'}}   ->  { build: { namespace: '-tools' }, dev: { namespace: '-dev' } }
Object.keys(phases0).forEach(properyName => {
    const property = phases0[properyName]
    Object.keys(property).forEach(phaseName => {
        phases[phaseName] = phases[phaseName] || {}
        phases[phaseName][properyName] = property[phaseName]
    })
})

process.on('unhandledRejection', reason => {
    console.log(reason)
    process.exit(1)
})

module.exports = exports = {
    phases,
    options,
    jiraUrl,
    bitbucketUrl,
    buildParams,
    deployParams,
    routePath,
    index,
}
