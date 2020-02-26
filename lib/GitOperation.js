"use strict";

const {childProcess} = require('./util-functions')
const {spawn}  = require("child_process");
const fs = require("fs")
const path = require('path');
const url = require('url')

module.exports = class GitOp {
   constructor(settings) {
      this.settings=settings
      this.tmpCredStoreFile=path.resolve(require('os').tmpdir(), `.git-credentials-${process.pid}`)
   }
    // Get Merge Base

 
   async run(args) {
      // console.log(`GitVerification: run with args ${args}`);
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
   /**
    * This will empty and prepare the baseDir diredtory, clone the repo 
    * and checkout the working branch.
    * Return the baseDir when prepare is done.
    */
/*    async prepare() {
      const baseDir = this.baseDir;
      return Promise.resolve()
      .then(()=>{
         return childProcess('git',['init', baseDir])
      })
      .then(()=>{
         return this._setupCredentials(basedir, url, this.gitCredentials)
      })
      .then(()=>{
         return childProcess('git',['remote', 'add', 'origin', url], {cwd: baseDir})
      })
      .then(()=>{
         // shallow fetch
         return childProcess('git',['fetch', 'origin', '--depth=1', this.workingBranch], {cwd: baseDir})
      })
      .then(()=>{
         return childProcess('git',['checkout', this.workingBranch], {cwd: baseDir})
      })
      .then(()=>{
         return baseDir;
      })
   } */

    async _setupCredentials(workDir, remoteUrl, cred) {
      // git config --global credential.helper 'store --file ~/.git-credentials'
      // git credential-store --file ~/.git-credentials store < .gitcredentials
      // result: https://fakeUsername:fakePass@apps.nrs.gov.bc.ca
      const tmpCredStoreFile=this.tmpCredStoreFile
      return Promise.resolve(true)
      .then(()=>{
         const host = url.parse(remoteUrl).host;
         fs.writeFileSync(tmpCredStoreFile, `https://${cred.username}:${cred.password}@${host}\n`,  {encoding:'utf8'});
      })
      .then(()=>{
         return childProcess('git',['config', '--local', 'credential.helper', `store --file=${tmpCredStoreFile}`], {cwd: workDir});
      })
   } // _setupGitGlobalCredential

   /**
    * This will insert a credential line in ~/.git-credentials for use.
    * @param {*} protocol http or https
    * @param {*} host host to contact
    * @param {*} gitCredentials the credential to checkout from git.
    */
/*    async _setupGitGlobalCredential(protocol, host, gitCredentials) {
      // git config --global credential.helper 'store --file ~/.git-credentials'
      // git credential-store --file ~/.git-credentials store < .gitcredentials
      // result: https://fakeUsername:fakePass@apps.nrs.gov.bc.ca

      const crd = `${protocol}://${gitCredentials.username}:${gitCredentials.password}@${host}`
      return new Promise((resolve, reject) => {
         const gitcredentialsFilePath = path.join(require('os').homedir(), '.git-credentials'); 
         const gitcredentialsFileStream = fs.createWriteStream(gitcredentialsFilePath);
         gitcredentialsFileStream.write(`${crd}\n`);
         resolve();
      });

   } // _setupGitGlobalCredential
 */
   async clear() {

      const tmpCredStoreFile=this.tmpCredStoreFile

   
      // TODO: remove the credential line from '.gitcredentials', else?
      this.run(['config','--local','--unset','credential.helper']).then(()=>{
         console.log(`Deleting ${tmpCredStoreFile}`)
         fs.unlinkSync(tmpCredStoreFile)
         console.log("Unset Credential Helper")
      })
      
   }
   getMergeBase(changeBranch,changeTarget){
      return this.run(['merge-base',`remotes/origin/${changeBranch}`,`remotes/origin/${changeTarget}`])
      .then((output) =>  {
         return output.stdout.split('\n')[0]
      })
    } 

   // Get latest Commit
   getLatestCommitOnTarget(changeTarget){
      return this.run(['rev-parse',`remotes/origin/${changeTarget}`])
      .then((output) =>  {
         return output.stdout.split('\n')[0]
      })
   }
    // Verify that latest commit is equal to merge-base commit
   async verify(){
      await this._setupCredentials(this.settings.dir,this.settings.url,this.settings.credentials)
               
            return this.getMergeBase(this.settings.branch.name,this.settings.change.target).then((commitHash1) =>  {
                  return this.getLatestCommitOnTarget(this.settings.change.target).then((commitHash2) =>{
                     return new Promise( (resolve) =>{
                        console.log(`Source Branch Common Ancestor commit: ${commitHash1}`);
                        console.log(`Target Branch Last Commit - commitHash2: ${commitHash2}`);
                        if(commitHash1==commitHash2){
                           resolve('True')
                        }
                        else{
                           throw new Error("\n --------------------------------------- \n Status: Cannot be Merged! \n Reason: Your branch is out of sync from target. \n Solution: Rebase, push and then run the Pipeline \n  ---------------------------------------")
                        }
                     });
                  });
               });

       //const basedir=__dirname
       //const git=new GitOps(basedir,url,credentials,changeBranch)
       //git.prepare()
      
   }
} //end GitOp class