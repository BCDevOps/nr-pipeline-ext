const {OpenShiftClientX} = require('pipeline-cli')
const moment = require('moment-timezone')
const {spawn}  = require("child_process")
const fs = require('fs')
const replace = require('replace-in-file');

module.exports = class Git {

    constructor() {
    } 

    run(args) {
             return new Promise( (resolve, reject) =>{
                
                //const _args = [ '-cp', `${liquibaseHomeDir}/liquibase.jar:${liquibaseHomeDir}/lib/:${liquibaseHomeDir}/lib/*:${drivers.join(':')}`, 'liquibase.integration.commandline.Main']
                //_args.push(...args)
                //console.log(_args.join(' '));
                const child = spawn('git', args)
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
                      //console.dir({stdout, stderr, exitCode})
                      resolve({stdout, stderr, exitCode});
                   }else {
                      console.log(stderr);
                      reject(`Exit code ${exitCode}`)
                   }
                })
             });
    }

    getMergeBase(changeBranch,changeTarget){
      return this.run(['merge-base',changeBranch,changeTarget]).then((output) =>  {
      return new Promise( (resolve, reject) =>{
                
         //const _args = [ '-cp', `${liquibaseHomeDir}/liquibase.jar:${liquibaseHomeDir}/lib/:${liquibaseHomeDir}/lib/*:${drivers.join(':')}`, 'liquibase.integration.commandline.Main']
         //_args.push(...args)
         //console.log(_args.join(' '));
         resolve(output.stdout.split('\n')[0])
      });
   });

    }

    getLatestCommitOnMaster(){
      return this.run(['ls-remote', 'origin', '-h', 'refs/heads/master']).then((output) =>  {
      return new Promise( (resolve, reject) =>{
                
         //const _args = [ '-cp', `${liquibaseHomeDir}/liquibase.jar:${liquibaseHomeDir}/lib/:${liquibaseHomeDir}/lib/*:${drivers.join(':')}`, 'liquibase.integration.commandline.Main']
         //_args.push(...args)
         //console.log(_args.join(' '));
         var commitHash=output.stdout.split('\t')[0]
         //console.log(commitHash)
         resolve(commitHash)
      });
   });

    }

    verify(changeBranch,changeTarget){
      return this.getMergeBase(changeBranch,changeTarget).then((commitHash1) =>  {
         return this.getLatestCommitOnMaster().then((commitHash2) =>{
            return new Promise( (resolve, reject) =>{
               if(commitHash1==commitHash2){
                 
                  resolve('True')
               }
               else{
                  console.log("Cannot be merged")
                  resolve('False')
               }
            });
         });
      })
   }
 
 } // end Git