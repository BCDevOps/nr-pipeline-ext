"use strict";
const path = require('path');
const fs = require('fs');
const Liquibase = require('./liquibase');
const Jira = require('./jira');

// static objects for some settings.
const ojdbcGav = {groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'};

// Loading configurations
const config = require(`${process.cwd()}/lib/config.js`)
const env = config.options.env

// on which directory
const projectDir = config.options.git.dir;
const migrationsDir = path.join(projectDir, 'migrations')
const env = config.options.env


// Jira settings
const jiraUrl = config.jiraUrl
const username = config.phases[env].credentials.idir.user 
const password = config.phases[env].credentials.idir.pass 
const changeBranch = config.options.git.branch.merge

const key= changeBranch.split('-')
const rfcIssueKey = key[0]+'-'+key[1]


// run RFC/RFD status 
// if (env==='dev') {
//     const jiraSettings = {};
//     /* TODO: need to find how to get following values.
//     const jiraSettings= { url:'bwa.nrs.gov.bc.ca/int/jira', 
//           username:`${process.env.JIRA_USER}`, 
//           password:`${process.env.JIRA_PASS}`, 
//           rfcIssueKey:`${process.env.JIRA_RFC}`, 
//           changeBranch:`${process.env.JIRA_CHANGE_BRANCH}`, 
//           branchName:`${process.env.JIRA_BRANCH_NAME}`, 
//           repoName: `${process.env.REPONAME}`, 
//           projectName: `${process.env.PROJECTNAME}`}
//           */
//     const jira = new JIRA(Object.assign({ phase: 'jira-update', jira: jiraSettings}));
//     jira.createRFD();
// }


// do db migration (all env)
async function deploySchema(migrationsDir, schemaName){
    const credentials = config.phases.build.credentials.idir;
    const liquibase = new Liquibase(Object.assign({drivers:[ojdbcGav], credentials}, config));
    return liquibase.migrate(migrationsDir, schemaName);
}

fs.readdir(migrationsDir, (err, files)=>{
    for (let file of files){
        const migrationDir = path.join(migrationsDir, file);
        const stats = fs.lstatSync(migrationDir)
        if (stats.isDirectory()){
            deploySchema(migrationDir, file);
        }
    }
});

