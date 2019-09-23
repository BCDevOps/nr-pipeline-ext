"use strict";
var fs = require('fs');
const {OpenShiftClient} = require('pipeline-cli');
const config = require(`${process.cwd()}/lib/config.js`);
const {childProcess} = require('./util-functions');

(async function () {

    const env = config.options.env;
    const tnsAdminSecretName = config.options.tnsAdminSecretName;
    const dbBackupCredentialSecretName = config.options.dbBackupCredentialSecretName;

    await backup(env);

    async function backup(env) {
        const namespace = `${config.phases[env].namespace}`;
        console.log(`Calling backup on env=${env}, namespace=${namespace}`) ;

        const backupScriptSecretName = await createBackupScriptSecret({namespace: namespace});
        const overrides = await _getOverride(backupScriptSecretName, tnsAdminSecretName, dbBackupCredentialSecretName);
        const overrides_opt = "--overrides=" + JSON.stringify(overrides);
        const backupPodName = "sqlcl-" + Math.random().toString(36).substring(2, 7);

        const cp = await childProcess("oc",[
            "-n",
            `${namespace}`,
            "run",
            `${backupPodName}`,
            "--image=overridden",
            "--restart=Never",
            "--command=true",
            "--attach=true",
            "--rm=true",
            `${overrides_opt}`])
            .finally(()=>{
                return childProcess("oc",[
                    "-n",
                    `${namespace}`,
                    "delete",
                    `secret/${backupScriptSecretName}`])
            })
        
            console.log(cp);

    } // end backup

    function createBackupScriptSecret(options) {
        const secretId = Math.random().toString(36).substring(2, 10)
        const secretName = `backup-script-${secretId}`
        const backupScriptFilePath = `${process.cwd()}/node_modules/nr-pipeline-ext/lib/backup.sql`;

        if (!fs.existsSync(backupScriptFilePath)){
            throw new Error(`No backup script available at: ${backupScriptFilePath}`);
        }

        return childProcess('oc', [
            `--namespace=${options.namespace}`,
            'create',
            'secret',
            'generic',
            secretName,
            `--from-file=backup-script.sql=${backupScriptFilePath}`
        ]).then( code =>{
            return secretName;
        });
    }

    async function _getOverride(backupScriptSecretName, tnsAdminSecretName, dbCredentialSecretName) {
        const volumeMount_path_backup_script = "/var/scripts/backup";
        const sqlclImage = "docker-registry.default.svc:5000/wp9gel-tools/oracle-client-tools:latest";
        //const executableMode = "511";
        
        const overrides = {
            spec: {
                containers: [
                    {
                        name: "sqlcl-backup",
                        image: sqlclImage,
                        command: [
                            'bash',
                            '-c',
                            `exec sqlcl -noupdates -nohistory "\${DB_USER}/\${DB_PASS}@\${DB_NAME}" '@${volumeMount_path_backup_script}/backup-script.sql'`],
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
                                name: 'backup-script',
                                mountPath: volumeMount_path_backup_script
                            }
                        ],
                        stdin: false,
                        stdinOnce: false,
                        tty: false,
                        resources: {
                            "limits": {
                              "cpu": "1",
                              "memory": "1024Mi"
                            },
                            "requests": {
                              "cpu": "500m",
                              "memory": "256Mi"
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
                        name: 'backup-script',
                        secret: {
                            secretName: backupScriptSecretName
                        }
                    }
                ]
            }
        }

        return overrides;
    } // end _getOverride


})();


