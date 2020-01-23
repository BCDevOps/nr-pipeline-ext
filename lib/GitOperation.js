"use strict";

const {childProcess} = require('./util-functions')
const {spawn}  = require("child_process");
const fs = require("fs")
const path = require('path');
const url = require('url')

module.exports = class GitOp {
   constructor(baseDir, gitRepoUrl, gitCredentials, workingBranch) {
      this.baseDir = baseDir;
      this.gitRepoUrl = gitRepoUrl;
      this.gitCredentials = gitCredentials;
      this.workingBranch = workingBranch;
   }

   /**
    * This will empty and prepare the baseDir diredtory, clone the repo 
    * and checkout the working branch.
    * Return the baseDir when prepare is done.
    */
   async prepare() {
      const baseDir = this.baseDir;
      return Promise.resolve()
      .then(()=>{
         if (fs.existsSync(baseDir)){
            console.warn("Working directory not empty, removing content.")
            return childProcess('rm', ['-rf', baseDir]);
         }
      })
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
   }

   async _setupCredentials(workDir, remoteUrl, cred) {
      // git config --global credential.helper 'store --file ~/.git-credentials'
      // git credential-store --file ~/.git-credentials store < .gitcredentials
      // result: https://fakeUsername:fakePass@apps.nrs.gov.bc.ca
      const tmpCredStoreFile=path.resolve(require('os').tmpdir(), `.git-credentials-${process.pid}`)
      return Promise.resolve(true)
      .then(()=>{
         const host = url.parse(remoteUrl).host;
         fs.writeFileSync(tmpCredStoreFile, `https://${cred.username}:${cred.password}@${host}\n`,  {encoding:'utf8'});
      })
      .then(()=>{
         process.once('exit', (code)=>{
            console.log(`Deleting ${tmpCredStoreFile}`)
            fs.unlinkSync(tmpCredStoreFile)
         })
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
   async _setupGitGlobalCredential(protocol, host, gitCredentials) {
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

   async clear() {
      // TODO: remove the credential line from '.gitcredentials', else?
   }
} //end GitOp class