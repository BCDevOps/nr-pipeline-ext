'use strict';
const liquibaseClient = require('liquibase');
const {OpenShiftClientX} = require('pipeline-cli')
var moment = require('moment-timezone')
const {spawn}  = require("child_process")
const fs = require('fs')
const LIQUIBASE_VERSION="3.5.3"
const replace = require('replace-in-file');


class Liquibase {   
    constructor(settings) {
        this.settings = settings
        this.liquibaseJarFile = '../liquibase-core-3.5.3.jar'
        this.liquibaseDownloadSite='https://repo1.maven.org/maven2/org/liquibase/liquibase-core/3.5.3/liquibase-core-3.5.3.jar'
        
      }
  
    install(){
      const self = this;
      return Promise.resolve(self.liquibaseJarFile)
      .then((fileName) => {
         return new Promise(resolve => {
            // if file exists
            fs.stat(fileName, function(err, stats) {
               resolve({fileName, exists: (!err)? true : false});
             });
         });
      }).then((file) => {
         if (file.exists === true){
            return file;
         }
         else {
            // download if not exist
            return new Promise(resolve => {
              console.log(file.fileName,  self.liquibaseDownloadSite)
               spawn('curl',['-sSL', '-o', file.fileName, self.liquibaseDownloadSite])
                .on("close", function (code, signal) {
                  resolve(file)
                })
            });
         }
      }).then((file=>{
         return Promise.resolve(file);
      }))
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
     this.install()
    const env =this.settings.options.env
    const namespace = this.settings.phases[env].namespace
  
    const oc = new OpenShiftClientX(Object.assign({ namespace: namespace }))
    const liquibaseJar = this.settings.liquibasejar 
    const classpath = this.settings.classpath
    const propertiesFile = this.settings.stages[stage].properties

    let ocsecret = this.settings.stages[stage].ocSecret.replace(/_/g,'-').toLowerCase()
    
    const user=oc.get(`secret/${ocsecret}`)
    const username = Buffer.from(user[0].data.username, 'base64').toString('utf-8')
    const password = Buffer.from(user[0].data.password, 'base64').toString('utf-8')
    
    const ocurl = this.settings.phases[env].dburl
    
    const url_cred=oc.get(`secret/${ocurl}`)
    const url=Buffer.from(url_cred[0].data.url, 'base64').toString('utf-8')

    
    if (stage=='backup') {
          this.backup()
          
    }
    await this.liquibaseMigrate(propertiesFile,liquibaseJar, classpath, url, username, password )
  }
}

module.exports = Liquibase