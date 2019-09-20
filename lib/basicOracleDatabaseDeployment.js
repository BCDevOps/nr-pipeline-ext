"use strict";
const path = require('path');
const fs = require('fs');
const Liquibase = require('./liquibase');
const Jira = require('./Jira');
const CONST = require("./constants");

(async function () {
    // static objects for some settings.
    const ojdbcGav = {groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'};

    // Loading configurations
    const config = require(`${process.cwd()}/lib/config.js`)
    const env = config.options.env

    // on which directory
    const projectDir = config.options.git.dir;
    const migrationsDir = path.join(projectDir, 'migrations')

    // Jira settings
    const jiraUrl = config.jiraUrl
    const username = config.phases[env].credentials.idir.user 
    const password = config.phases[env].credentials.idir.pass 
    const changeBranch = config.options.git.branch.merge
    const branchName = "PR-"+config.options.pr

    const key= changeBranch.split('-')
    const rfcIssueKey = key[0]+'-'+key[1]

    const gitUrl = config.options.git.url
    const elements = gitUrl.split('/')
    const projectName = elements[6].toUpperCase()
    const repoName = elements[7].split('.')[0]

    
    // do db migration (all env)
    async function deploySchema(migrationsDir, schemaName){
        const credentials = config.phases.build.credentials.idir;
        const liquibase = new Liquibase(Object.assign({drivers:[ojdbcGav], credentials}, config));
        return liquibase.migrate(migrationsDir, schemaName);
    }

    fs.readdir(migrationsDir, async (err, files)=>{
        for (let file of files){
            const migrationDir = path.join(migrationsDir, file);
            const stats = fs.lstatSync(migrationDir)
            if (stats.isDirectory()){
                deploySchema(migrationDir, file)
                    .then(result => {})
                    .catch(err => process.exit(1))
            }
        }
    });

    const jiraSettings= { url: jiraUrl, username: username, 
                        password: password, 
                        rfcIssueKey:rfcIssueKey, 
                        changeBranch:changeBranch, 
                        branchName:branchName, 
                        repoName: repoName, 
                        projectName: projectName}
    const jiraClient = new Jira(Object.assign({ phase: 'jira-update', jira: jiraSettings}))

    // transition RFDs/Subtasks
    await transitionRfdAndSubtasksToResolved(rfcIssueKey);

    async function transitionRfdAndSubtasksToResolved(rfcIssueKey) {
        if (env === CONST.ENV.DEV || env === CONST.ENV.DLVR) {
            await transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.DLVR);
        }
        else if (env === CONST.ENV.TEST) {
            await transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.TEST);
        }
        else if (env === CONST.ENV.PROD) {
            await transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.PROD);
        }
    }

    async function transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, jiraTargetEnv) {
        const targetOnEnvRfdIssueKeys = await jiraClient.getRfdTaskIds(rfcIssueKey, jiraTargetEnv);
        for (let rfdIssuekey of targetOnEnvRfdIssueKeys) {
            const rfdSubtaskInfo = await jiraClient.getIssueSubtasksInfo(rfdIssuekey);
            // TODO: verify workflow transition correctness and possible other scenarios.
            for (let subTask of rfdSubtaskInfo){
                await jiraClient.transition(subTask.key, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);
            }
            await jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);
            
            for (let subTask of rfdSubtaskInfo){
                const subtaskId = subTask.key
                await jiraClient.transition(subtaskId, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 
                await jiraClient.transition(subtaskId, CONST.ISSUE_TRANSITION_ACTION_NAME.RESOLVE); 
            }
        }
    }

})();