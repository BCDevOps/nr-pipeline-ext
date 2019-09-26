"use strict";
const path = require('path');
const fs = require('fs');
const Liquibase = require('./Liquibase');
const Jira = require('./Jira');
const CONST = require("./constants");
const Verifier = require('./InputDeployerVerify');
const config = require(`${process.cwd()}/lib/config.js`);

(async function () {

    const env = config.options.env
    if( env.toLowerCase() != 'sbox' && env.toLowerCase() != 'sandbox')
    {
    const verify=new Verifier(Object.assign(config));
    const verifyStatus = await verify.verifyBeforeDeployment();

    if(verifyStatus==="Ready"){
    // static objects for some settings.
    const ojdbcGav = {groupId:'oracle', artifactId: 'ojdbc8', version: '18.3.0.0'};

    // Loading configurations
   
 

    // on which directory
    const projectDir = config.options.git.dir;
    const migrationsDir = path.join(projectDir, 'migrations')

    // Jira settings
    const jiraUrl = config.jiraUrl
    const username = config.phases[env].credentials.idir.user 
    const password = config.phases[env].credentials.idir.pass 
    const changeBranch = config.options.git.branch.merge

    const key= changeBranch.split('-')
    const rfcIssueKey = key[0]+'-'+key[1]


    
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
    const jiraSettings= { 
        url: jiraUrl, 
        username: username, 
        password: password, 
        rfcIssueKey:rfcIssueKey
       }
    
        // Create the jira object of the type Jira 
        const jira = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings}))
        jira.transitionRFDpostDeployment(env)
    }
}
else {
    const ojdbcGav = {groupId:'oracle', artifactId: 'ojdbc8', version: '18.3.0.0'};

    // on which directory
    const projectDir = config.options.git.dir;
    const migrationsDir = path.join(projectDir, 'migrations')
    
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
 }

})();