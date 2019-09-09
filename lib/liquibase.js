'use strict';
const liquibaseClient = require('liquibase');
const {OpenShiftClientX} = require('pipeline-cli')
const moment = require('moment-timezone')
const {spawn}  = require("child_process")
const fs = require('fs')
const LIQUIBASE_VERSION="3.5.3"
const replace = require('replace-in-file');
const path = require('path');
const MavenRepository = require("./MavenRepository");


class Liquibase {
  /**
   * 
   * @param {*} settings 
   */
    constructor(settings) {
        this.settings = settings
        this.liquibaseJarFile = '../liquibase-core-3.5.3.jar'
        this.liquibaseDownloadSite='https://repo1.maven.org/maven2/org/liquibase/liquibase-core/3.5.3/liquibase-core-3.5.3.jar' 
      }
  
    install(){
      const credentials = this.settings.credentials
      const mavenRepository = new MavenRepository('https://bwa.nrs.gov.bc.ca/int/artifactory/libs-release', credentials);
      return mavenRepository.cache({groupId:'org.liquibase', artifactId:'liquibase-core', version:'3.5.3'}).then((liquibaseJarFile) =>{
        const promises = []
        if (this.settings.drivers){
          for (let driver of this.settings.drivers){
            promises.push(mavenRepository.cache(driver))
          }
        }

        return Promise.all(promises).then((drivers) => {
            return {liquibase: liquibaseJarFile, drivers:drivers};
        })
      })
    }
        // class defintion for the class Liquibase
  async liquibaseMigrate(defaultsFile, liquibaseJar, ojdbcJar, url, username, password){ 
    await liquibaseClient({
        
        defaultsFile: defaultsFile,
        liquibase: liquibaseJar,
        driver: 'oracle.jdbc.OracleDriver',
        classpath: ojdbcJar,
        url: url
    })
    .run('migrate')
    .then(() => console.log('Liquibase Migration Succeeded'))
    .catch((err) => {
      console.log('Liquibase Migration Failed');
      throw err;
    })
    
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
  
   async migrate (migrationsDir, schemaName){
    this.install().then( (artifacts) =>{
      const env =this.settings.options.env
      const namespace = this.settings.phases[env].namespace
    
     

      const oc = new OpenShiftClientX(Object.assign({ namespace: namespace }))
      //const propertiesFile = this.settings.stages[stage].properties
      
      const user=oc.get(`secret/deploy-${schemaName.toLowerCase().replace(/_/g, '-')}-${env}`)[0]
      const dbusername = Buffer.from(user.data.username, 'base64').toString('utf-8')
      const dbpassword = Buffer.from(user.data.password, 'base64').toString('utf-8')
      const dbhostname = Buffer.from(user.data.hostname, 'base64').toString('utf-8')
      const dbport = Buffer.from(user.data.port, 'base64').toString('utf-8')
      const dbservicename = Buffer.from(user.data.servicename, 'base64').toString('utf-8')

      const url=`jdbc:oracle:thin:@//${dbhostname}:${dbport}/${dbservicename}`;

      const propertiesFilePath = path.join(migrationsDir, 'deployment.properties');
      const propertiesFileStream = fs.createWriteStream(propertiesFilePath);
      propertiesFileStream.write(Buffer.from("driver: oracle.jdbc.OracleDriver\n"));
      propertiesFileStream.write(Buffer.from(`changeLogFile: ${path.join(migrationsDir, 'changelog', schemaName + '.xml')}\n`));
      propertiesFileStream.write(Buffer.from(`username: ${dbusername}\n`));
      propertiesFileStream.write(Buffer.from(`password: ${dbpassword}\n`));
      propertiesFileStream.write(Buffer.from("logLevel: debug\n"));
      propertiesFileStream.write(Buffer.from(`logFile: ${path.join(migrationsDir, 'deployment.log')}\n`));
      propertiesFileStream.close();
  
      return this.liquibaseMigrate(propertiesFilePath, artifacts.liquibase, artifacts.drivers[0], url, dbusername, dbpassword )
    })
  }
}

module.exports = Liquibase