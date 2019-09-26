"use strict";

const fs = require('fs');
const path = require('path');
const {childProcess, writeToFile} = require('./util-functions');
const CONST = require('./constants');

/**
 * This class handles database backup/recovery.
 * The class initialize 'sqlcl' Openshift pod to trigger db backup/recovery. 
 */
module.exports = 
class BackupRecovery {
    constructor(settings) {
        this.settings = settings;
     }

    /**
     * Create backup/recovery container on Openshift to do db backup/recovery for a specified 'env'
     * It uses '--image=overridden' option to override template to create pod.
     * 
     * @param {string} env environment to backup or recovery.
     * @param {DB_ACTION} constant value of DB_ACTION ('backup' or 'recovery')
     */
    async doBackupOrRecovery(op, schemaList) {
        const env = this.settings.env;
        const namespace = this.settings.namespace;
        console.log(`Calling '${op}' on env=${env}, namespace=${namespace}`);
        if (op!==CONST.DB_ACTION.BACKUP && op!==CONST.DB_ACTION.RECOVERY) {
            throw new Error(`Unknown db operation argument: '${op}'`);
        }

        const backupOrRecoveryScriptSecretName = await this.createBackupRecoveryScriptSecret({namespace, op, schemaList});
        const overrides = await this._getOverride(backupOrRecoveryScriptSecretName, this.settings.tnsAdminSecretName, 
                                                this.settings.dbCredentialSecretName, op);
        const overrides_opt = "--overrides=" + JSON.stringify(overrides);
        const bkryPodName = "sqlcl-" + Math.random().toString(36).substring(2, 7);

        return childProcess("oc",[
            "-n",
            `${namespace}`,
            "run",
            `${bkryPodName}`,
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
                    `secret/${backupOrRecoveryScriptSecretName}`])
            })

    } // end doBackupOrRecovery   

    /**
     * As a example, the produced script looks something like below:
     * WHENEVER SQLERROR EXIT SQL.SQLCODE
     * EXEC auto_bkp_reco.EXPORT_UTILITY.export_schema(auto_bkp_reco.t_param_list('CWI_SPI_DC','CWI_TXN'),'AUTOMATED_DUMP_DIR','logfile.log','dumpfile.dmp');
     * EXIT
     */
    async _writeBackupRecoveryScript(op, backupRecoveryScriptFilePath, bkryFilename_noExtension, schemasList) {
        const owner = 'auto_bkp_reco';
        let bkruPkgFunction = null;
        await writeToFile(backupRecoveryScriptFilePath, 'WHENEVER SQLERROR EXIT SQL.SQLCODE\n');
        if (op === CONST.DB_ACTION.BACKUP) {
            bkruPkgFunction = 'EXPORT_UTILITY.export_schema';
        }
        else if (op === CONST.DB_ACTION.RECOVERY) {
            bkruPkgFunction = 'IMPORT_UTILITY.import_schema';
        }
        
        const schema_list = "'" + schemasList.join("\',\'") + "'";

        await writeToFile(backupRecoveryScriptFilePath, `EXEC ${owner}.${bkruPkgFunction}(${owner}.t_param_list(${schema_list}),'AUTOMATED_DUMP_DIR','${bkryFilename_noExtension}.log','${bkryFilename_noExtension}.dmp');\n`, true);
        await writeToFile(backupRecoveryScriptFilePath, `EXIT\n`, true);
    }

    /**
     * Create and save temporary backup/recovery script secret on Openshift for db backup/recovery.
     * Secrete name is randomly generated so don't run into conflict for multiple pipeline.
     * @param {*} options 
     */
    async createBackupRecoveryScriptSecret(options) {
        const op = options.op;
        const secretId = Math.random().toString(36).substring(2, 10);
        const secretName = `${op}-script-${secretId}`;
        const backupRecoveryScriptFilePath = path.join(`/tmp`, `${op}.sql`);
        const bkryFilename_noExtension = `${this.settings.projectName}.${this.settings.changeBranch}.${this.settings.prNumber}`;

        await this._writeBackupRecoveryScript(op, backupRecoveryScriptFilePath, bkryFilename_noExtension, options.schemaList);
        
        // const backupRecoveryScriptFilePath = path.join(__dirname, `${op}.sql`);
        if (!fs.existsSync(backupRecoveryScriptFilePath)){
            throw new Error(`No backup script available at: ${backupRecoveryScriptFilePath}`);
        }

        return childProcess('oc', [
            `--namespace=${options.namespace}`,
            'create',
            'secret',
            'generic',
            secretName,
            `--from-file=backup-recovery-script.sql=${backupRecoveryScriptFilePath}`
        ]).then(() =>{
            fs.unlinkSync(backupRecoveryScriptFilePath);
            return secretName;
        });
    }

    /**
     * Generate 'override' template object for creating the sqlcl pod.
     * @param {*} backupOrRecoveryScriptSecretName backup script secret name generated on Openshift.
     * @param {*} tnsAdminSecretName TNS_NAME secret used for connection 
     * @param {*} dbCredentialSecretName 
     */
    async _getOverride(backupOrRecoveryScriptSecretName, tnsAdminSecretName, dbCredentialSecretName, op) {
        const volumeMount_path_backup_recovery_script = `/var/scripts/${op}`;
        const sqlclImage = "docker-registry.default.svc:5000/wp9gel-tools/oracle-client-tools:latest";
        //const executableMode = "511";
        
        const overrides = {
            spec: {
                containers: [
                    {
                        name: "sqlcl-backup-recovery",
                        image: sqlclImage,
                        command: [
                            'bash',
                            '-c',
                            `exec sqlcl -noupdates -nohistory "\${DB_USER}/\${DB_PASS}@\${DB_NAME}" '@${volumeMount_path_backup_recovery_script}/backup-recovery-script.sql'`],
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
                                mountPath: volumeMount_path_backup_recovery_script
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
                        name: 'backup-recovery-script',
                        secret: {
                            secretName: backupOrRecoveryScriptSecretName
                        }
                    }
                ]
            }
        }

        return overrides;
    } // end _getOverride

} // end BackupRecovery class



