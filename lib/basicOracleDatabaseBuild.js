const Jira = require('./Jira');
const config = require(`${process.cwd()}/lib/config.js`)
const env = 'build'
const Git = require('../lib/GitOperation')


// Jira config

const username = config.phases[env].credentials.idir.user 
const password = config.phases[env].credentials.idir.pass 
const changeBranch = config.options.git.branch.merge
const gitUrl = config.options.git.url

const elements = gitUrl.split('/')

const repoName = elements[7].split('.')[0]
const key= changeBranch.split('-')

Object.assign(config.options.git, {credentials: {'username':username,'password':password}})

const EMPTY = '';
let changeTarget=(config.options.git.change != undefined)? 
                  (config.options.git.change.target != undefined? config.options.git.change.target.trim() : EMPTY) :
                  EMPTY;
            
if(changeTarget && changeTarget.toLowerCase() == 'master') {
  // Build for target = 'master'

  const jiraUrl = config.jiraUrl;
  const branchName = "PR-"+config.options.pr;
(async()=>{
    await _createJiraAutoRFDs(jiraUrl, repoName, changeBranch, branchName, username, password);

    await _gitTargetSyncVerify();
})();

}
else if (changeTarget != EMPTY) {
  // Build for target = 'other branch' 
  (async()=>{
    await _gitTargetSyncVerify();

})();
}
else {
    //pass
}

// end build

/**
* Calling Git module to verify if both change/target branches are not out of sync.
*/
async function _gitTargetSyncVerify() {
const git = new Git(config.options.git);
let result = await git.verify();
if(result == 'True') {
  console.log("Successfully Verified that branch is not out of sync with target")
}
}

/**
* This create JIRA RFDs labled with 'auto' to be used only for our pipeiline deployment.
* It creates 1 auto RFD for each environment for DLVR, TEST, PROD.
*/

async function _createJiraAutoRFDs(jiraUrl, repoName, changeBranch, branchName, username, password) {
const issueElements = changeBranch.split('-')
const key= changeBranch.split('-')
const rfcIssueKey = key[0]+'-'+key[1]
const projectName = issueElements[0].toUpperCase()

const jiraconfig= { 
  url: jiraUrl, 
  username: username, 
  password: password, 
  rfcIssueKey:rfcIssueKey, 
  changeBranch:changeBranch, 
  branchName:branchName, 
  repoName: repoName, 
  projectName: projectName
}  

const jira = new Jira(Object.assign({ phase: 'jira-update', jira: jiraconfig}))
await jira.createRFD()  
}

