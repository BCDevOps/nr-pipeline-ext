'use strict';

class Jira {       // class defintion for the class jira
  constructor(settings) {
    this.settings = settings

  }
  // definiton of member function createRFD invoked in jira-update.js
  async createRFD() {
    var JiraClient = require('jira-connector'); // Use npm module jira-connector
    var jira = new JiraClient({
      host: this.settings.jira.url,  // define jira url
      basic_auth: {
        username: this.settings.jira.username, // define username to connect to jira url
        password: this.settings.jira.password // define password to connect to jira url
      }
    });
    // Get the RFC Issue Information by passing the RFC Issue key passed as env variable 
    const rfcIssue = await jira.issue.getIssue({
      issueKey: this.settings.jira.rfcIssueKey
      , function(error, issue) {
      }
    });
    console.log(rfcIssue)
    //Fetch RFC Issue Links and determine the number of issuelinks (helpful in the case of each env)
    var rfcIssueLinks = rfcIssue.fields.issuelinks;
    console.log(rfcIssue)
    var arraySize = rfcIssueLinks.length;
    console.log(arraySize)
    var rfcIssueKey = this.settings.jira.rfcIssueKey;
    var changeBranch = this.settings.jira.changeBranch;
    var branchName = this.settings.jira.branchName;
    var reviewer = this.settings.jira.reviewer;
    var repoName = this.settings.jira.repoName;
    var projectName = this.settings.jira.projectName;
    var version = this.settings.jira.version;
    /* Create RFDs based on the conditions:
        No RFD links exist and the env is dev, create RFD task and Subtask for dev
        Dev RFD exists and env is test, create RFD task abd Subtask for test
        Dev and Test RFD exist and env is prod, create RFD Task and Subtask for prod */

    if (arraySize == 0) {
      console.log("In IF")
      var environment = [ 'INT', 'TEST', 'PROD' ]
      const self = this;
      environment.forEach ( async function(env) {
      if (env == 'INT'){
        reviewer='Developer'
      }
      else if (env == 'TEST'){
        reviewer='IIT'
      }
      else {
        reviewer='Business'
      }
      var rfdIssue = await jira.issue.createIssue({
       //json parameters to create and RFD in JIRA
        fields: {
          fixVersions: [
            {
              name: `${version}`,
            }
          ],
          labels: [
            `${projectName}`
          ],
          issuetype: {
            name: "RFD",
          },
          project: {
            key: `${projectName}`
          },
          customfield_10121: {
            value: `${env}`,
          },
          //components: [{ name: `${repoName}` }],
          description: "Deploying changes from PR NO: ${branchName} in REPO: ${repoName}",
          summary: `RFD-${env}-${changeBranch}-${branchName}`
        }
        , function(error, issue) {
        }
      });
      var rfdIssue_key = rfdIssue.key;
      await jira.issueLink.createIssueLink({
        //json paramters to create an issue link between RFD and RFC
        issueLink: {
          type: { id: "10300" },
          inwardIssue: { key: rfcIssueKey },
          outwardIssue: { key: rfdIssue_key }
        }
        , function(error, rfdIssue) {
        }
      });
      const rfdSubtaskIssue1 = await jira.issue.createIssue({
        //json paramters to create an RFD subtask
        fields: {
          project: { key: `${projectName}` },
          parent: { key: `${rfdIssue_key}` },
          issuetype: { name: "RFD-subtask" },
          summary: `RFD-Subtask-${env}-${reviewer}-DBA-${changeBranch}-${branchName}`,
          customfield_10121: {
            value: `${env}`,
          },
          components: [{ name: `${repoName}` }]
        }
        , function(error, issue) {
        }
      });
      var rfdSubtaskIssue_key1 = rfdSubtaskIssue1.key;
      var rfdSubtaskIssue2 = await jira.issue.createIssue({
        //json paramters to create an RFD subtask
        fields: {
          project: { key: `${projectName}` },
          parent: { key: `${rfdIssue_key}` },
          issuetype: { name: "RFD-subtask" },
          summary: `RFD-Subtask-${env}-${reviewer}-DA-${changeBranch}-${branchName}`,
          customfield_10121: {
            value: `${env}`,
          },
          components: [{ name: `${repoName}` }]
        }
        , function(error, issue) {
        }
      });
      var rfdSubtaskIssue_key2 = rfdSubtaskIssue2.key;

      await self.transition(rfdIssue_key, 731); 
      //await self.transition(rfdSubtaskIssue_key, 731); 
    });
  }
    else { //if RFDs are aready present
      var temp = rfcIssue.fields.issuelinks
      temp = temp.sort()
      const self = this;
      [0,1,2].forEach(function(element) {
      //For each RFD Link to RFC, fetch the task key and task status and transition to "Submitted" status
          var rfdTaskStatus = temp[`${element}`].outwardIssue.fields.status.name;
          var rfdTask = temp[`${element}`].outwardIssue.key;
          console.log(rfdTaskStatus, rfdTask);
          jira.issue.getIssue({
          issueKey: rfdTask
          , function(error, issue) {
          }
        }).then(function (result) {
          return result.fields.subtasks
        }).then(async rfdSubtaskInfo => {
          var rfdSubtask1 = rfdSubtaskInfo[0].key;
          var rfdSubtaskStatus1 = rfdSubtaskInfo[0].fields.status.name;

          var rfdSubtask2 = rfdSubtaskInfo[1].key;
          var rfdSubtaskStatus2 = rfdSubtaskInfo[1].fields.status.name;
          
          if (rfdTaskStatus != "Submitted"){
          if (rfdTaskStatus == "Resolved" ) {
            // If status is resolved, Reopen Issue
            await self.transition(rfdSubtask1, 951);
            await self.transition(rfdSubtask2, 951);
            await self.transition(rfdTask, 951); 
            
          }
          else if (rfdTaskStatus == "Closed") {
            // If status is closed, Reopen Issue
            await self.transition(rfdSubtask1, 3);
            await self.transition(rfdSubtask2, 3);
            await self.transition(rfdTask, 3);
          }
          else {
             //Cancel Issue
            await self.transition(rfdTask, 921);
            //Reopen Issue           
            await self.transition(rfdSubtask1, 3);
            await self.transition(rfdSubtask2, 3); 
            await self.transition(rfdTask, 3);
          }
          //Resubmit Issue
          await self.transition(rfdTask, 931); 
        }
        })
    });
  }
}
  // definiton of member function transition invoked in jira-transition.js
  async transition(issueKey, transitionId) {
    var JiraClient = require('jira-connector');
    var jira = new JiraClient({
      host: this.settings.jira.url,
      basic_auth: {
        username: this.settings.jira.username,
        password: this.settings.jira.password
      }
    });
    // Accept issue key and status to transition issue
     await jira.issue.transitionIssue({
      issueKey: issueKey,
      transition: { id: transitionId }
      , function(error, rfdIssue) {
      }
    });

  }
}

module.exports = Jira
