"use strict";
var fs = require('fs');
const {OpenShiftClient} = require('pipeline-cli');
const config = require(`${process.cwd()}/lib/config.js`);
const {childProcess} = require('./util-functions');

(async function () {

    const env = config.options.env;

    // TODO, may need to pass schema to backup
    await backup(env);

    async function backup(env) {
        const namespace = `${config.phases[env].namespace}`;
        console.log(`Calling backup on env=${env}, namespace=${namespace}`) ;
        
        const overrides_opt = "--overrides=" + _getOverride(env);

        const cp = await childProcess("oc",[
            "-n",
            `${namespace}`,
            "run",
            "sqlcl-ian",
            "--image=overridden",
            "--restart=Never",
            "--command=true",
            "--wait=true",
            `${overrides_opt}`])
        
            console.log(cp);
        // TODO, 
        // Call: oc get pod/sqlcl-ian -o template --template '{{.status.phase}}{{"\n"}}'
        // to determine if the pod is: Succeeded, Failed or Running.
        // Might need timeout to wait.

    } // end backup

    function _getOverride(env) {

        const volume_name_wallet = "tns-admin";
        const volume_secret_wallet = "wiof-dlvr-wallet";
        const volume_name_sqlcl_login = "sqlcl-spi-login";
        const volumn_configMap_sqlcl_login = "sqlcl-spi-login";
        const volume_name_backup_script = "backup-spi-script";
        const volumn_configMap_backup_script = "backup-spi-script";

        const volumeMount_name_wallet = volume_name_wallet;
        const volumeMount_path_wallet = "/var/tns_admin";
        const volumeMount_name_sqlcl_login = volume_name_sqlcl_login;
        const volumeMount_path_sqlcl_login = "/var/scripts/sqlcl-spi-login";
        const volumeMount_name_backup_script = volume_name_backup_script;
        const volumeMount_path_backup_script = "/var/scripts/backup-spi-script";

        const envVar_name_wallet = "TNS_ADMIN";
        const envVar_value_wallet = volumeMount_path_wallet;
        // const envVar_name_backupUser_pass = "ORA_BACKUP_PASS"; // was using USER_CWI_SPI_DC_PASS
        // const envVar_secretKeyRef_dbUser_pass = "backup-user"; // deploy-cwi-spi-dc-dev
        const envVar_name_backupUser_pass = "USER_CWI_SPI_DC_PASS"; // was using USER_CWI_SPI_DC_PASS
        const envVar_secretKeyRef_dbUser_pass = "deploy-cwi-spi-dc-dev"; // deploy-cwi-spi-dc-dev
        const envVar_secretKeyRef_key_dbUser_pass = "password";

        const sqlclImage = "docker-registry.default.svc:5000/wp9gel-tools/oracle-client-tools:latest";
        const command_sqlclLoginScript = "/var/scripts/sqlcl-spi-login/sqlcl-spi-login.sh";
        const executableMode = "511";
        
        const overrides = {
            spec: {
                containers: [
                    {
                        name: "sqlcl-backup",
                        image: sqlclImage,
                        command: [command_sqlclLoginScript],
                        env: [
                            {
                                name: envVar_name_wallet,
                                value: envVar_value_wallet
                            },
                            {
                                name: envVar_name_backupUser_pass,
                                valueFrom: {
                                    secretKeyRef: {
                                        name: envVar_secretKeyRef_dbUser_pass,
                                        key: envVar_secretKeyRef_key_dbUser_pass
                                    }
                                }
                            }
                        ],
                        volumeMounts: [
                            {
                                name: volumeMount_name_wallet,
                                mountPath: volumeMount_path_wallet
                            },
                            {
                                name: volumeMount_name_sqlcl_login,
                                mountPath: volumeMount_path_sqlcl_login
                            },
                            {
                                name: volumeMount_name_backup_script,
                                mountPath: volumeMount_path_backup_script
                            }
                        ],
                        stdin: true,
                        stdinOnce: true,
                        tty: true,
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
                        name: volume_name_wallet,
                        secret: {
                            secretName: volume_secret_wallet
                        }
                    },
                    {
                        name: volume_name_sqlcl_login,
                        configMap: {
                            name: volumn_configMap_sqlcl_login,
                            defaultMode: executableMode
                        }
                    },
                    {
                        name: volume_name_backup_script,
                        configMap: {
                            name: volumn_configMap_backup_script
                        }
                    }
                ]
            }
        }

        return JSON.stringify(overrides);
    } // end _getOverride


})();


