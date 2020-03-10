'use strict'
const fs = require('fs')
const path = require('path')
// TOFIX: never used?
// const { OpenShiftClient } = require('@bcgov/pipeline-cli')
const config = require(`${process.cwd()}/lib/config.js`)
const { childProcess } = require('./util-functions')
const CONST = require('./constants');

(async function () {
  const env = config.options.env
  const op = config.options.op
  const tnsAdminSecretName = config.phases.dev.backupRecovery.tnsAdminSecretName
  const dbCredentialSecretName = config.phases.dev.backupRecovery.dbCredentialSecretName

  await backupRecovery(env, op)

  /**
     * Create backup/recovery container on Openshift to do db backup/recovery for a specified 'env'
     * It uses '--image=overridden' option to override template to create pod.
     *
     * @param {string} env environment to backup or recovery.
     * @param {DB_ACTION} constant value of DB_ACTION ('backup' or 'recovery')
     */
  async function backupRecovery (env, op) {
    const namespace = `${config.phases[env].namespace}`
    console.log(`Calling ${op} on env=${env}, namespace=${namespace}`)
    if (op !== CONST.DB_ACTION.BACKUP && op !== CONST.DB_ACTION.RECOVERY) {
      throw new Error(`Unknown db operation argument: '${op}'`)
    }

    const backupOrRecoveryScriptSecretName = await createBackupRecoveryScriptSecret({ namespace: namespace, op: op })
    const overrides = await _getOverride(backupOrRecoveryScriptSecretName, tnsAdminSecretName, dbCredentialSecretName, op)
    const overridesOpt = '--overrides=' + JSON.stringify(overrides)
    const bkryPodName = 'sqlcl-' + Math.random().toString(36).substring(2, 7)

    return childProcess('oc', [
      '-n',
            `${namespace}`,
            'run',
            `${bkryPodName}`,
            '--image=overridden',
            '--restart=Never',
            '--command=true',
            '--attach=true',
            '--rm=true',
            `${overridesOpt}`])
      .finally(() => {
        return childProcess('oc', [
          '-n',
                    `${namespace}`,
                    'delete',
                    `secret/${backupOrRecoveryScriptSecretName}`])
      })
  } // end backup

  /**
     * Create and save temporary backup/recovery script secret on Openshift for db backup/recovery.
     * Secrete name is randomly generated so don't run into conflict for multiple pipeline.
     * Assume there is a template script at ./lib/backup.sql;recovery.sql
     * @param {*} options
     */
  function createBackupRecoveryScriptSecret (options) {
    const op = options.op
    const secretId = Math.random().toString(36).substring(2, 10)
    const secretName = `${op}-script-${secretId}`
    const backupRecoveryScriptFilePath = path.join(__dirname, `${op}.sql`)

    if (!fs.existsSync(backupRecoveryScriptFilePath)) {
      throw new Error(`No backup script available at: ${backupRecoveryScriptFilePath}`)
    }

    return childProcess('oc', [
            `--namespace=${options.namespace}`,
            'create',
            'secret',
            'generic',
            secretName,
            `--from-file=backup-recovery-script.sql=${backupRecoveryScriptFilePath}`
    ]).then(code => {
      return secretName
    })
  }

  /**
     * Generate 'override' template object for creating the sqlcl pod.
     * @param {*} backupOrRecoveryScriptSecretName backup script secret name generated on Openshift.
     * @param {*} tnsAdminSecretName TNS_NAME secret used for connection
     * @param {*} dbCredentialSecretName
     */
  async function _getOverride (backupOrRecoveryScriptSecretName, tnsAdminSecretName, dbCredentialSecretName, op) {
    const volumeMountPathBackupRecoveryScript = `/var/scripts/${op}`
    const sqlclImage = 'docker-registry.default.svc:5000/wp9gel-tools/oracle-client-tools:latest'
    // const executableMode = "511";

    const overrides = {
      spec: {
        containers: [
          {
            name: 'sqlcl-backup-recovery',
            image: sqlclImage,
            command: [
              'bash',
              '-c',
                            `exec sqlcl -noupdates -nohistory "\${DB_USER}/\${DB_PASS}@\${DB_NAME}" '@${volumeMountPathBackupRecoveryScript}/backup-recovery-script.sql'`],
            env: [
              {
                name: 'TNS_ADMIN',
                value: '/var/tns_admin'
              },
              {
                name: 'DB_USER',
                valueFrom: {
                  secretKeyRef: {
                    name: dbCredentialSecretName,
                    key: 'username'
                  }
                }
              },
              {
                name: 'DB_PASS',
                valueFrom: {
                  secretKeyRef: {
                    name: dbCredentialSecretName,
                    key: 'password'
                  }
                }
              },
              {
                name: 'DB_NAME',
                value: 'WEBADE'
              }
            ],
            volumeMounts: [
              {
                name: 'tns-admin',
                mountPath: '/var/tns_admin'
              },
              {
                name: 'backup-recovery-script',
                mountPath: volumeMountPathBackupRecoveryScript
              }
            ],
            stdin: false,
            stdinOnce: false,
            tty: false,
            resources: {
              limits: {
                cpu: '1',
                memory: '1024Mi'
              },
              requests: {
                cpu: '500m',
                memory: '256Mi'
              }
            }
          }
        ],
        volumes: [
          {
            name: 'tns-admin',
            secret: {
              secretName: tnsAdminSecretName
            }
          },
          {
            name: 'backup-recovery-script',
            secret: {
              secretName: backupOrRecoveryScriptSecretName
            }
          }
        ]
      }
    }

    return overrides
  } // end _getOverride
})()
