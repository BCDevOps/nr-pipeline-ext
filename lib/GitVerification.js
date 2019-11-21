
const {spawn}  = require("child_process")


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
      return this.run(['merge-base',`remotes/origin/${changeBranch}`,`remotes/origin/${changeTarget}`]).then((output) =>  {
      return new Promise( (resolve, reject) =>{
         resolve(output.stdout.split('\n')[0])
      });
   });

    } 

   // Get latest Commit
    getLatestCommitOnMaster(username,password,gitUrl){
       const gitUsername = username.replace(/@/g,'%40')
       const modifiedGitUrl = gitUrl.replace('bwa',`${gitUsername}:${password}@bwa`)

      return this.run(['ls-remote', modifiedGitUrl, 'refs/heads/master']).then((output) =>  {
      return new Promise( (resolve, reject) =>{
         var commitHash=output.stdout.split('\t')[0]
         resolve(commitHash)
      });
   });

    }
    // Verify that latest commit is equal to merge-base commit
    verify(changeBranch,changeTarget,user,pass,url){
      return this.getMergeBase(changeBranch,changeTarget).then((commitHash1) =>  {
         return this.getLatestCommitOnMaster(user,pass,url).then((commitHash2) =>{
            return new Promise( (resolve) =>{
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