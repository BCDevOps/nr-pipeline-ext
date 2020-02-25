
const {spawn}  = require("child_process")
const GitOps = require('./GitOperation')

module.exports = class Git {

    constructor() {
    } 

    run(args) {
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
    // Get Merge Base
    getMergeBase(changeBranch,changeTarget){
      return this.run(['fetch','origin', changeBranch])
      .then(()=>{
         return this.run(['fetch','origin', changeTarget])
      })
      .then(()=>{
         return this.run(['merge-base',`remotes/origin/${changeBranch}`,`remotes/origin/${changeTarget}`])
      })
      .then((output) =>  {
         return output.stdout.split('\n')[0]
      })
    } 

   // Get latest Commit
   getLatestCommitOnTarget(username,password,gitUrl,changeTarget){
      return this.run(['fetch','origin', changeTarget])
      .then(()=>{
         return this.run(['rev-parse',`remotes/origin/${changeTarget}`])
      })
      .then((output) =>  {
         return output.stdout.split('\n')[0]
      })
   }
    // Verify that latest commit is equal to merge-base commit
    verify(changeBranch,changeTarget,user,pass,url){
       let credentials={}
       credentials['username']=user
       credentials['password']=pass
       const basedir=__dirname
       const git=new GitOps(basedir,url,credentials,changeBranch)
       git.prepare()
      return this.getMergeBase(changeBranch,changeTarget).then((commitHash1) =>  {
         return this.getLatestCommitOnTarget(user,pass,url,changeTarget).then((commitHash2) =>{
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
      })
   }
 
 } // end Git