'use strict'
const path = require('path')
const fs = require('fs')
const Liquibase = require('./Liquibase')
const Jira = require('./Jira')
// TOFIX: never used?
// const CONST = require('./constants')
const Verifier = require('./InputDeployerVerify')
const config = require(`${process.cwd()}/lib/config.js`);

(async function () {
  const ojdbcGav = { groupId: 'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0' }
  const env = config.options.env
  // on which directory
  const projectDir = config.options.git.dir
  const migrationsDir = path.join(projectDir, 'migrations')
  if (config.options['local-mode'] === 'true') {
    await migrate(migrationsDir)
  } else {
    if (env.toLowerCase() !== 'sbox' && env.toLowerCase() !== 'sandbox') {
      const verify = new Verifier(Object.assign(config))
      const verifyStatus = await verify.verifyBeforeDeployment()

      if (verifyStatus === 'Ready') {
        // static objects for some settings.

        // Jira settings
        const jiraUrl = config.jiraUrl
        const username = config.phases[env].credentials.idir.user
        const password = config.phases[env].credentials.idir.pass
        const changeBranch = config.options.git.branch.merge

        const key = changeBranch.split('-')
        const rfcIssueKey = key[0] + '-' + key[1]

        // do db migration (all env)
        await migrate(migrationsDir)

        const jiraSettings = {
          url: jiraUrl,
          username: username,
          password: password,
          rfcIssueKey: rfcIssueKey
        }

        // Create the jira object of the type Jira
        const jira = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings }))
        jira.transitionRFDpostDeployment(env)
      } else {
        throw new Error('Not Ready for Deployment, Check the Jira Statuses to know what you need to do')
      }
    } else {
      await migrate(migrationsDir)
    }
  }

  async function migrate (migrationsDir) {
    const files = fs.readdirSync(migrationsDir)
    for (const file of files) {
      const migrationDir = path.join(migrationsDir, file)
      const stats = fs.lstatSync(migrationDir)
      if (stats.isDirectory()) {
        await deploySchema(migrationDir, file)
          .then(result => {})
          .catch(err => {
            console.log(err)
            process.exit(1)
          })
      }
    }
  }

  // do db migration (all env)
  function deploySchema (migrationsDir, schemaName) {
    const credentials = config.phases.build.credentials.idir
    // console.log(schemaName)
    const liquibase = new Liquibase(Object.assign({ drivers: [ojdbcGav], credentials }, config))
    return liquibase.migrate(migrationsDir, schemaName)
  }
})()
