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
      // check or create the working directory
      const baseDir = this.baseDir;
      if (!fs.existsSync(baseDir)){
         console.log("Creating working directory...")
         fs.mkdirSync(baseDir);
      }
      else {
         // remove all content
         console.warn("Working directory not empty, removing content.")
         await childProcess('rm', ['-rf', baseDir]);
         await childProcess('mkdir', [baseDir]);
      }

      //  or use this, var exp = gitRepoUrl.split(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);
      //  protocol = exp[2]; host = exp[4]
      const urlGroups = url.parse(this.gitRepoUrl)
      const protocol = urlGroups.protocol.slice(0, -1);
      const host = urlGroups.host;
      await this._setupGitGlobalCredential(protocol, host, this.gitCredentials);

      await childProcess('git',['clone', this.gitRepoUrl, baseDir])
         .then(() => childProcess('git',['branch', this.workingBranch], {cwd: baseDir}))
         .then(() => childProcess('git',['checkout', this.workingBranch], {cwd: baseDir}))

      return Promise.resolve(baseDir); // prepare() is ok
   }

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