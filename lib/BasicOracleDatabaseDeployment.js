"use strict";
const path = require('path');
const fs = require('fs');
const Liquibase = require('./liquibase');

// static objects
const ojdbcGav = {groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'};

// Loading configurations
const config = require(`${process.cwd()}/lib/config.js`)

// on which directory
const projectDir = config.options.git.dir;
const migrationsDir = path.join(projectDir, 'migrations')

// TODO: run RFC/RFD status

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

