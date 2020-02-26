'use strict';
const liquibaseClient = require('liquibase');
const {OpenShiftClientX} = require('@bcgov/pipeline-cli')
const moment = require('moment-timezone')
const {spawn}  = require("child_process")
const fs = require('fs')
const LIQUIBASE_VERSION="3.8.0"
const replace = require('replace-in-file');
const path = require('path');
const MavenRepository = require("./MavenRepository");


module.exports = class Liquibase {

   constructor(settings) {
      this.settings = settings
      this.liquibaseZipFile = '/tmp/liquibase/liquibase-3.8.0-bin.tar.gz'
      this.liquibaseHomeDir = '/tmp/liquibase'
      this.liquibaseDownloadSite='https://repo1.maven.org/maven2/org/liquibase/liquibase-core/3.8.0/liquibase-core-3.8.0-bin.tar.gz'
      this.jdbcDrivers = [{groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}] ;
   }

   downloadDrivers() {
      const drivers = []
      if (this.jdbcDrivers) {
         const mavenRepository = new MavenRepository('https://bwa.nrs.gov.bc.ca/int/artifactory/libs-release', this.settings.credentials);
         for (let jdbcDriverGAV of this.jdbcDrivers) {
            drivers.push(mavenRepository.cache(jdbcDriverGAV));
         }
      }
      //const process = spawn('cp',[drivers[0], `${this.liquibaseHomeDir}/lib`]);
      //process.on("exit", function (code, signal) {
      //   console.log("Exit from ojdbc driver copy", code)
      //})
      return Promise.all(drivers);
   }
  
   install() {
      const self = this;
      return Promise.resolve(self.liquibaseZipFile)
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
                     if (!fs.existsSync(self.liquibaseHomeDir)){
                        //console.log("make home directory")
                        fs.mkdirSync(self.liquibaseHomeDir);
                     }
                     spawn('curl',['-sSL', '-o', file.fileName, self.liquibaseDownloadSite, '--output',  self.liquibaseHomeDir])
                        .on("exit", function (code, signal) {
                        resolve(file)
                        })
                  });
               }
            }).then( (file) => {
               return new Promise(resolve => {
                  // setting up home directory for unzip
                  const proc = spawn('tar',['-xzf', file.fileName, '-C', self.liquibaseHomeDir]);

                  proc.on('exit', (exitCode)=>{
                     //console.log("Exit from liquibase extract", exitCode)
                     resolve(self.liquibaseHomeDir)
                  });
               });
            }).then((homeDir)=>{
               return this.downloadDrivers().then((drivers)=>{
                  return `${homeDir}`;
               });
            })
   }
   run(args, options) {
      return this.install().then((liquibaseHomeDir) =>  {
         return this.downloadDrivers().then((drivers) =>{
            return new Promise( (resolve, reject) =>{
               
               const _args = [ '-cp', `${liquibaseHomeDir}/liquibase.jar:${liquibaseHomeDir}/lib/:${liquibaseHomeDir}/lib/*:${drivers.join(':')}`, 'liquibase.integration.commandline.Main']
               _args.push(...args)
               console.log(_args.join(' '));
               const child = spawn('java', _args, {cwd:options.cwd})
               let stdout = ""
               let stderr = ""
               child.stderr.on('data', (data) => {
                  stderr += data;
               })
               child.stdout.on('data', (data) => {
                  stdout += data;
               });
               child.on("exit", (exitCode)=>{
                  if (exitCode == 0){
                     console.dir({stdout, stderr, exitCode})
                     resolve({stdout, stderr, exitCode});
                  }else {
                     console.log(stdout);
                     reject(`Exit code ${exitCode}`)
                  }
               })
            });
         });
      })
   }
  
   _prepare(migrationDir, schemaName) {
      const migrationsDir = path.dirname(migrationDir);
      return this.downloadDrivers()
         .then((drivers) => {
            const driverPath = drivers.reduce((previous, current) => { return previous.concat(";", current) }, "").substring(1);

            return new Promise(resolve => {
               const env =this.settings.options.env
               const namespace = this.settings.phases[env].namespace
            
               const oc = new OpenShiftClientX(Object.assign({ namespace: namespace }))
               //const propertiesFile = this.settings.stages[stage].properties
               
               const user=oc.get(`secret/deploy-${schemaName.toLowerCase().replace(/_/g, '-')}-${env}`)[0]
               const dbusername = Buffer.from(user.data.username, 'base64').toString('utf-8')
               const dbpassword = Buffer.from(user.data.password, 'base64').toString('utf-8')
               //console.log(dbusername)
               const dbhostname = Buffer.from(user.data.hostname, 'base64').toString('utf-8')
               const dbport = Buffer.from(user.data.port, 'base64').toString('utf-8')
               const dbservicename = Buffer.from(user.data.servicename, 'base64').toString('utf-8')
      
               const url=`jdbc:oracle:thin:@//${dbhostname}:${dbport}/${dbservicename}`;
      
               const changeLogFile = path.relative(migrationsDir, path.join(migrationDir, 'changelog', schemaName + '.xml'));
               const logFile = path.relative(migrationsDir, path.join(migrationDir, 'deployment.log'));
               const propertiesFilePath = path.join(migrationDir, 'deployment.properties');
               const propertiesFileStream = fs.createWriteStream(propertiesFilePath);
               propertiesFileStream.write(Buffer.from("driver: oracle.jdbc.OracleDriver\n"));
               propertiesFileStream.write(Buffer.from(`changeLogFile: ${changeLogFile}\n`));
               propertiesFileStream.write(Buffer.from(`username: ${dbusername}\n`));
               propertiesFileStream.write(Buffer.from(`password: ${dbpassword}\n`));
               propertiesFileStream.write(Buffer.from("logLevel: debug\n"));
               propertiesFileStream.write(Buffer.from(`logFile: ${logFile}\n`));
               propertiesFileStream.write(Buffer.from(`classpath: ${driverPath}\n`));
               propertiesFileStream.close();
         
               resolve({url, propertiesFilePath});
            });
         });
   }

   migrate(migrationDir, schemaName) {
      const migrationsDir = path.dirname(migrationDir);
      return this._prepare(migrationDir, schemaName)
               .then(args => {
                  return this.run([`--url=${args.url}`,`--defaultsFile=${args.propertiesFilePath}`, 'migrate'], {cwd: migrationsDir}) ;
               });
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

   async status(migrationDir, schemaName) {
      const migrationsDir = path.dirname(migrationDir);
      return this._prepare(migrationDir, schemaName)
      .then(args => {
         return this.run([`--url=${args.url}`,`--defaultsFile=${args.propertiesFilePath}`, 'status', '--verbose'], {cwd: migrationsDir});
      });
   }

   async rollback(migrationDir, schemaName, count) {
      const migrationsDir = path.dirname(migrationDir);
      return this._prepare(migrationDir, schemaName)
      .then(args => {
         return this.run([`--url=${args.url}`,`--defaultsFile=${args.propertiesFilePath}`, '--verbose', 'rollbackCount', `${count}`], {cwd: migrationsDir});
      });
   }

} // end Liquibase