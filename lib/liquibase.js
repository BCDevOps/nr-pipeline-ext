
'use strict';
const liquibaseClient = require('liquibase');
const {OpenShiftClientX} = require('pipeline-cli')
var moment = require('moment-timezone')
const fs = require('fs')
const replace = require('replace-in-file');


class Liquibase {   
    constructor(settings) {
        this.settings = settings
        
      }
      
    async initialize (stage) {
         const env =this.settings.options.env
        const namespace = this.settings.phases[env].namespace
        const oc = new OpenShiftClientX(Object.assign({ namespace: namespace }))
        const liquibaseJar = this.settings.liquibasejar 
        const classpath = this.settings.classpath
        const propertiesFile = this.settings.stages[stage].properties

        let ocsecret = this.settings.stages[stage].ocSecret.replace(/_/g,'-').toLowerCase()
        console.log(ocsecret)
        const user=oc.get(`secret/${ocsecret}`)
        const username = Buffer.from(user[0].data.username, 'base64').toString('utf-8')
        const password = Buffer.from(user[0].data.password, 'base64').toString('utf-8')
        
        const ocurl = this.settings.phases[env].dburl
        console.log(this.settings.phases[env])
        const url_cred=oc.get(`secret/${ocurl}`)
        const url=Buffer.from(url_cred[0].data.url, 'base64').toString('utf-8')

        
        if (stage=='backup') {
              this.backup()
              
        }
        this.liquibaseMigrate(propertiesFile,liquibaseJar, classpath, url, username, password )
    }
  
        // class defintion for the class Liquibase
    async liquibaseMigrate(defaultsFile, liquibaseJar, ojdbcJar, url, username, password){ 
    await liquibaseClient({
    defaultsFile: defaultsFile,
    liquibase: liquibaseJar,
    driver: 'oracle.jdbc.OracleDriver',
    classpath: ojdbcJar,
    url: url,
    username: username,
    password: password
})
.run('migrate')
.then(() => console.log('Liquibase Migration Succeeded'))
.catch((err) => console.log('fail', err));
}

async backup () {
  var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
  await replace({files: this.settings.stages['backup'].sql, from: /logfile.log/g, to:tDate+'_logfile.log'});
  await replace({files: this.settings.stages['backup'].sql, from: /dumpfile.dmp/g, to:tDate+'_dumpfile.dmp'});
  await replace({files: this.settings.stages['recovery'].sql, from: /logfile.log/g, to:tDate+'_logfile.log'});
  await replace({files: this.settings.stages['recovery'].sql, from: /dumpfile.dmp/g, to:tDate+'_dumpfile.dmp'}); 
  await replace({files: this.settings.stages['backup'].changelog, from: /id=\"[0-9]*\"/g, to:'id=\"'+tDate+'\"'});
  await replace({files: this.settings.stages['recovery'].changelog, from: /id=\"[0-9]*\"/g, to:'id=\"'+tDate+'\"'});

}
  
   async migrate (stage){
     this.initialize(stage)
  }
}

module.exports = Liquibase