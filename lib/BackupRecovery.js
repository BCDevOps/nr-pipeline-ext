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
        const tnsAdminSecretName = this.settings.tnsAdminSecretName;
        console.log(`Calling '${op}' on env=${env}, namespace=${namespace}, with connection from: ${tnsAdminSecretName}`);
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
            .then((result) => {
                console.log(`${op} result: `, result);
            })
            .finally((result)=>{
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
     * EXEC auto_bkp_reco.EXPORT_UTIL.export_schema(auto_bkp_reco.EXPORT_UTIL.t_name_list('CWI_SPI_DC','CWI_TXN'),'AUTOMATED_DUMP_DIR','logfile2.log','dumpfile2.dmp');
     * EXIT
     */
    async _writeBackupRecoveryScript(op, backupRecoveryScriptFilePath, bkryFilename_noExtension, schemasList) {
        const owner = 'auto_bkp_reco';
        const procedurePackage = 'EXPORT_UTIL';
        const append = true;

        let bkryFunction = null;
        if (op === CONST.DB_ACTION.BACKUP) {
            bkryFunction = 'export_schema';
        }
        else if (op === CONST.DB_ACTION.RECOVERY) {
            bkryFunction = 'import_schema';
        }
        const nameListFunction = 't_name_list';
        const schema_list = "'" + schemasList.join("\',\'") + "'";

        // PL/SQL script for SQLcl:
        await writeToFile(backupRecoveryScriptFilePath, 'SET serveroutput ON;\n');
        await writeToFile(backupRecoveryScriptFilePath, 'WHENEVER SQLERROR EXIT SQL.SQLCODE\n', append);
        await writeToFile(backupRecoveryScriptFilePath, 'DECLARE\n', append);
        await writeToFile(backupRecoveryScriptFilePath, '   err_code INTEGER;\n', append);
        await writeToFile(backupRecoveryScriptFilePath, '   err_msg VARCHAR2(500);\n', append);
        await writeToFile(backupRecoveryScriptFilePath, 'BEGIN\n', append);

        await writeToFile(backupRecoveryScriptFilePath, `${owner}.${procedurePackage}.${bkryFunction}(${owner}.${procedurePackage}.${nameListFunction}(${schema_list}),'AUTOMATED_DUMP_DIR','${bkryFilename_noExtension}.log','${bkryFilename_noExtension}.dmp');\n`, append);

        // Exception Handling: reference - https://dba.stackexchange.com/questions/9441/how-to-catch-and-handle-only-specific-oracle-exceptions
        // Dumpfile duplicated ORA message/code: ORA-39001: invalid argument value. 
        // !!! TODO: it should be ORA-27038: created file already exists
        const ORA_CODE_CREATED_FILE_ALREADY_EXISTS = '-39001';
        await writeToFile(backupRecoveryScriptFilePath, 'EXCEPTION\n', append);
        await writeToFile(backupRecoveryScriptFilePath, '   WHEN OTHERS THEN\n', append);
        await writeToFile(backupRecoveryScriptFilePath, `       dbms_output.put_line('err_code: ' || SQLCODE);\n`, append); 
        await writeToFile(backupRecoveryScriptFilePath, `       dbms_output.put_line('err_msg: ' || SUBSTR(SQLERRM, 1, 500));\n`, append);
        await writeToFile(backupRecoveryScriptFilePath, `       \n`, append);
        await writeToFile(backupRecoveryScriptFilePath, `       IF SQLCODE = ${ORA_CODE_CREATED_FILE_ALREADY_EXISTS} THEN\n`, append);
        await writeToFile(backupRecoveryScriptFilePath, `           dbms_output.put_line('     ');\n`, append);
        await writeToFile(backupRecoveryScriptFilePath, `           dbms_output.put_line('!!! Note: [SURPRESS this error as it indicates dump file already exists.] !!!');\n`, append);
        await writeToFile(backupRecoveryScriptFilePath, '           NULL; -- suppress ORA-39001 for dump file already exist\n', append);             
        await writeToFile(backupRecoveryScriptFilePath, '       ELSE', append);             
        await writeToFile(backupRecoveryScriptFilePath, '           RAISE;', append);           
        await writeToFile(backupRecoveryScriptFilePath, '       END IF;', append);        
        await writeToFile(backupRecoveryScriptFilePath, 'END;\n', append);
        await writeToFile(backupRecoveryScriptFilePath, '/\n', append);
        await writeToFile(backupRecoveryScriptFilePath, 'EXIT\n', append);
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



