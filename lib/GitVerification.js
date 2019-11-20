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
                      resolve({stdout, stderr, exitCode});
                   }else {
                      console.log(stderr);
                      reject(`Exit code ${exitCode}`)
                   }
                })
             });
    }
    // Get Merge Base
    getMergeBase(changeBranch,changeTarget){
      return this.run(['merge-base',changeBranch,changeTarget]).then((output) =>  {
      return new Promise( (resolve, reject) =>{
         resolve(output.stdout.split('\n')[0])
      });
   });

    }

   // Get latest Commit
    getLatestCommitOnMaster(){
      return this.run(['ls-remote', 'origin', '-h', 'refs/heads/master']).then((output) =>  {
      return new Promise( (resolve, reject) =>{
         var commitHash=output.stdout.split('\t')[0]
         resolve(commitHash)
      });
   });

    }
    // Verify that latest commit is equal to merge-base commit
    verify(changeBranch,changeTarget){
      return this.getMergeBase(changeBranch,changeTarget).then((commitHash1) =>  {
         return this.getLatestCommitOnMaster().then((commitHash2) =>{
            return new Promise( (resolve) =>{
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