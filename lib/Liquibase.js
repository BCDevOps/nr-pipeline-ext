'use strict';
const liquibaseClient = require('liquibase');
const {OpenShiftClientX} = require('pipeline-cli')
const moment = require('moment-timezone')
const {spawn}  = require("child_process")
const fs = require('fs')
const LIQUIBASE_VERSION="3.8.0"
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
        this.liquibaseZipFile = '/tmp/liquibase/liquibase-3.8.0-bin.tar.gz'
        this.liquibaseHomeDir = '/tmp/liquibase/'
        this.liquibaseDownloadSite='https://github.com/liquibase/liquibase/releases/download/liquibase-parent-3.8.0/liquibase-3.8.0-bin.tar.gz'
        this.jdbcDrivers = [{groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}] ;
      }

      downloadDrivers (){
        const drivers = []
        if (this.jdbcDrivers){
           const mavenRepository = new MavenRepository('https://bwa.nrs.gov.bc.ca/int/artifactory/libs-release', this.settings.credentials);
           for (let jdbcDriverGAV of this.jdbcDrivers){
              drivers.push(mavenRepository.cache(jdbcDriverGAV));
           }
        }
        const process = spawn('cp',[drivers[0], `${this.liquibaseHomeDir}/lib`]);
        process.on("exit", function (code, signal) {
          console.log("Exit from ojdbc driver copy", code)
        })
        return Promise.all(drivers);
     }
  
      install () {
        const self = this;
        return Promise.resolve(self.liquibaseZipFile)
        .then((fileName) => {
         //   return new Promise(resolve => {
              // if file exists
            //   fs.stat(fileName, function(err, stats) {
            //      resolve({fileName, exists: (!err)? true : false});
            //    });
            const status = fs.statSync(fileName);
            console.log(status);
            return {fileName, exists: true}
         //   });
        }).then((file) => {
           if (file.exists === true){
              return file;
           }
           else {
              // download if not exist
              return new Promise(resolve => {
                 spawn('curl',['-sSL', '-o', file.fileName, self.liquibaseDownloadSite])
                  .on("exit", function (code, signal) {
                    resolve(file)
                  })
              });
           }
        }).then( (file) => {
           return new Promise(resolve => {
              // setting up home directory for unzip
              if (!fs.existsSync(self.liquibaseHomeDir)){
                 console.log("make home directory")
                 fs.mkdirSync(self.liquibaseHomeDir);
              }
              const proc = spawn('tar',['-xvzf', file.fileName, '-C', self.liquibaseHomeDir]);
  
              proc.on("exit", (exitCode)=>{
                 console.log("Exit from liquibase extract", exitCode)
                 resolve(self.liquibaseHomeDir)
              });
           });
        }).then((homeDir)=>{
          return this.downloadDrivers().then(()=>{ return `${homeDir}`});
       })
    }
        // class defintion for the class Liquibase
  liquibaseMigrate(defaultsFile, url){ 
    // await liquibaseClient({
        
    //     defaultsFile: defaultsFile,
    //     liquibase: '/Users/posivana/work/TeamZero/Database/spi-db-scripts/liquibase',
    //     driver: 'oracle.jdbc.OracleDriver',
    //     classpath: ' /Users/posivana/work/TeamZero/Database/spi-db-scripts/lib/*' ,
    //     url: url
    // })
    // .run('migrate')
    // .then(() => console.log(`Liquibase Migration Succeeded for ${schemaName}`))
    // .catch((err) => {
    //   console.log('Liquibase Migration Failed');
    //   throw err;
    // })

    const child = spawn('/tmp/liquibase/liquibase',[ `--url=${url}`,`--defaultsFile=${defaultsFile}`,'migrate'])
    child.stdout.on( 'data', data => {
    console.log( `stdout: ${data}` );
  } );

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
  
   migrate (migrationsDir, schemaName){
    return this.install().then( (artifacts) =>{
      
      const env =this.settings.options.env
      const namespace = this.settings.phases[env].namespace
     

      const oc = new OpenShiftClientX(Object.assign({ namespace: namespace }))
      //const propertiesFile = this.settings.stages[stage].properties
      
      const user=oc.get(`secret/deploy-${schemaName.toLowerCase().replace(/_/g, '-')}-${env}`)[0]
      const dbusername = Buffer.from(user.data.username, 'base64').toString('utf-8')
      const dbpassword = Buffer.from(user.data.password, 'base64').toString('utf-8')
      console.log(dbusername)
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
  
      return this.liquibaseMigrate(propertiesFilePath, url) 
    })
  }
}

module.exports = Liquibase