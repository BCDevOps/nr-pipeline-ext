"use strict";
const {spawn}  = require("child_process")
const fs = require("fs")
const {exists:fileExists} = require("fs")

const SCHEMA_CRAWLER_VERSION = 'v15.06.01'; // current version used.

class SchemaCrawler{

   constructor(){
      this.schemaCrawlerZipFile = '/tmp/schemacrawler-15.06.01-distribution.zip'
      this.shemaCrawlerHomeDir = '/tmp/schemacrawler-15.06.01'
      this.schemaCrawlerDownloadSite='https://github.com/schemacrawler/SchemaCrawler/releases/download/v15.06.01/schemacrawler-15.06.01-distribution.zip';
   }

   /**
    * This install SchemaCrawler if it does not exist initially.
    * The current version it installs for SchemaCrawler is v15.06.01.
    * The installation will be under "/tmp/schemacrawler-15.06.01"
    */
   install () {
      const self = this;
      return Promise.resolve(self.schemaCrawlerZipFile)
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
               spawn('curl',['-sSL', '-o', file.fileName, self.schemaCrawlerDownloadSite])
                .on("close", function (code, signal) {
                  resolve(file)
                })
            });
         }
      }).then( (file) => {
         return new Promise(resolve => {
            // setting up home directory for unzip
            if (!fs.existsSync(self.shemaCrawlerHomeDir)){
               console.log("make home directory")
               fs.mkdirSync(self.shemaCrawlerHomeDir);
            }
            const proc = spawn('unzip',['-q', '-n', file.fileName, '-d', self.shemaCrawlerHomeDir]);

            proc.on("exit", (exitCode)=>{
               console.log("exit")
               resolve(self.shemaCrawlerHomeDir)
            });
         });
      }).then((homeDir)=>{
         return Promise.resolve(homeDir);
      })
   }

   /**
    * Returning current installed version of SchemaCrawler
    */
   version () {
      return this._run(['-version'])
      .then((proc)=>{
         const lines = proc.stdout.split(/\r?\n/);
         return lines[0].substring('SchemaCrawler '.length);
      })
   }

   /**
    * Run SchemaCrawler command with opts.
    * The example of opts for detail would be:
    * opts={"-url": "[the_url]",
    *       "-user": "[the_user]", 
    *       "password": "[the_pass]", 
    *       "-command": "detail", 
    *       "-infolevel": "detailed"},
    *       ...
    *       ...
    * @param {object} opts object of arguments in JSON format.
    */
   runCommand(opts) {
      let args = [];
      for (let [key, value] of Object.entries(opts)) {
         if (value === "") {
            args.push(key);
         }
         else {
            args.push(`${key}=${value}`);
         }
      }

      return this._run(args).then((proc) => {
         if(proc.stderr) {
            console.error(proc.stderr);
            return({exitCode: -1, result: proc.stderr});
         }
         else {
            return({exitCode: 0, result: proc.stdout});
         }
      });
   }

   /**
    * Run SchemaCrawler with arguments.
    * @param {Array} args as string array; i.e ['-lh', '/usr']
    */
   _run(args){
      return this.install()
      .then((homeDir)=>{
         return new Promise( resolve =>{
            console.log(`${homeDir}/schemacrawler-15.06.01-distribution/_schemacrawler/schemacrawler.sh`)
            console.log(args.join(' '))
            const proc = spawn(`${homeDir}/schemacrawler-15.06.01-distribution/_schemacrawler/schemacrawler.sh`, args);

            proc.on("exit", (exitCode)=>{
               resolve({stdout,stderr});
            });

            let stdout = ""
            let stderr = ""
            proc.stderr.on('data', (data) => {
               stderr += data;
            })
            proc.stdout.on('data', (data) => {
               stdout += data;
            });
         });
      })
   }
} // End SchemaCrawler Class

module.exports = {SchemaCrawler, SCHEMA_CRAWLER_VERSION};