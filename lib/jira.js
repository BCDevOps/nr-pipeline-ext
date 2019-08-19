// import JiraClient from "jira-connector"; // node does not support ES6 import yet in year 2019.
// ref: https://timonweb.com/tutorials/how-to-enable-ecmascript-6-imports-in-nodejs/

"use strict";
const JiraClient = require("jira-connector");

const REVIEWER_ENV_MAP = new Map([["DLVR", "Developer"], ["TEST", "IIT"], ["PROD", "Business"]]);
const ISSUE_TYPE_CODE = { RFD: "RFD", RFD_SUBTASK: "RFD-subtask" };
const ISSUE_TRANSITION_NAME = { SUBMITTED: "Submitted", CLOSED: "Closed", REOPENED: "Reopened", RESOLVED: "Resolved" }; // issue type specific status workflow transition 'name'.

class Jira {
   constructor(settings) {
      this.jiraSettings = settings.jira;
      this.jiraClientInitialized = false; // depends on jira-connector:JiraClient.
      this.rfcIssueInitialized = false; // depends on if RFC issue can be retrieved.
   }

   /**
    * Function ensures the RFD issues are created and linked to RFC issue for each environment.
    * Also ensure RFC/RFD/RFD subtasks status transition to the state intended.
    */
   async createRFD() {
      const jiraClient = this.getJiraClient();
      const rfcIssueKey = this.jiraSettings.rfcIssueKey;
      const self = this;

      // Retrieving RFC issue info
      const rfcIssue = await this.retrieveRfcIssueInfo(this.jiraSettings.rfcIssueKey);
      this.rfcIssue = rfcIssue;
      const rfcIssueStatus = rfcIssue.fields.status.name;

      // Initialize JIRA component (if not exists)
      const projectName = this.jiraSettings.projectName;
      const repoName = this.jiraSettings.repoName;
      await this.initializeProjectComponent(projectName, repoName);

      // TODO: ask Poornima if below logic still hold true because current code does not seem to do what comment says.
      /* Create RFDs based on the conditions:
        No RFD links exist and the env is dev, create RFD task and Subtask for dev
        Dev RFD exists and env is test, create RFD task and Subtask for test
        Dev and Test RFD exist and env is prod, create RFD Task and Subtask for prod */
      const containsIssueLinks = rfcIssue.fields.issuelinks != undefined && rfcIssue.fields.issuelinks.length > 0;
      if (!containsIssueLinks) {
         const changeBranch = this.jiraSettings.changeBranch;
         const branchName = this.jiraSettings.branchName;
         const self = this;

         // loop for each env.
         REVIEWER_ENV_MAP.forEach(async function(reviewer, env) {
            // new RFD created.
            const newRfdIssue = await self.createIssue(ISSUE_TYPE_CODE.RFD, {
               version: this.jiraSettings.version,
               projectName: projectName,
               env: env,
               changeBranch: changeBranch,
               branchName: branchName,
               repoName: repoName
            });

            //issue link between RFD and RFC
            var rfdIssueKey = newRfdIssue.key;
            jiraClient.issueLink.createIssueLink({
               issueLink: {
                  type: { id: "10300" },
                  inwardIssue: { key: rfcIssueKey },
                  outwardIssue: { key: rfdIssueKey }
               }
            });

            // 2 new RFD subtasks created.
            const createNewRfdSubTaskCounts = 2;
            let i = 0;
            while (i < createNewRfdSubTaskCounts) {
               self.createIssue(ISSUE_TYPE_CODE.RFD_SUBTASK, {
                  projectName: projectName,
                  env: env,
                  rfdIssueKey: rfdIssueKey,
                  changeBranch: changeBranch,
                  branchName: branchName,
                  reviewer: reviewer,
                  repoName: repoName
               });
               i++;
            }

            await self.transition(rfdIssueKey, 731);
         });
      } else {
         self._manageRfcTransition(this.rfcIssue, 81);

         var issuelinks = rfcIssue.fields.issuelinks;
         // temp = temp.sort(); TODO ask why need sorting
         [0, 1, 2].forEach(function(index) {
            //For each RFD Link to RFC, fetch the task key and task status and transition to "Submitted" status
            var rfdTaskId = issuelinks[`${index}`].outwardIssue.key;
            self._manageRfdAndSubtasksTransition(rfdTaskId);
         });
      }
   }

   /**
    * Initialize JIRA project 'component' to the 'repoName' if not exists.
    * @param {string} projectName
    * @param {string} repoName
    * @returns {object} new component return if not exists previously or 'true' if found.
    */
   async initializeProjectComponent(projectName, repoName) {
      let projectInfo = {};
      const jiraClient = this.getJiraClient();
      try {
         projectInfo = await jiraClient.project.getProject({ projectIdOrKey: projectName });
      } catch (err) {
         console.dir(err);
         throw new Error("Could not get JIRA project using projectName: " + projectName);
      }

      if (projectInfo.components.findIndex(c => c.name === repoName) == -1) {
         const newComponent = await jiraClient.component.createComponent({
            component: { name: repoName, project: projectName }
            // component: {name: `${repoName}`, project: `${projectName}`}
         });
         console.log("JIRA component was created with: " + projectName + " for project: " + projectName);
         return newComponent;
      }
      return true;
   }

   /**
    * Async function to retrieve RFC issue.
    * @param {string} rfcIssueKey
    * @return {Promise} Resolved with RFC issue data.
    */
   async retrieveRfcIssueInfo(rfcIssueKey) {
      if (this.rfcIssueInitialized) {
         return this.rfcIssue;
      }

      console.log("Retrieving RFC issue with issueKey: " + rfcIssueKey);
      return this.getIssue(rfcIssueKey);
   }

   /**
    * Transitioning issue (@issueKey) to status (@transitionId)
    * @param {string} issueKey
    * @param {number} transitionId
    */
   async transition(issueKey, transitionId) {
      try {
         console.log(issueKey + " is transitioning to: " + transitionId);
         await this.jiraClient.issue.transitionIssue({
            issueKey: issueKey,
            transition: { id: transitionId }
         });
         console.log("Successful transitioning for issueKey: " + issueKey);
      } catch (err) {
         console.dir(err);
         throw new Error("Could not transition for issueKey: " + issueKey);
      }
   }

   /**
    * A wrapper function to use jira-connector to get issue with 'issueKey'
    * @param {*} issueKey issueKey to get the issue.
    * @returns {Promise} found issue.
    */
   async getIssue(issueKey) {
      try {
         const issue = await this.getJiraClient().issue.getIssue({ issueKey: issueKey });
         console.log("Issue are successfully retrieved for issueKey: " + issueKey);
         return issue;
      } catch (err) {
         console.dir(err);
         throw new Error("Could not retrieve issue with issueKey: " + issueKey);
      }
   }

   /**
    * A wrapper function to use jira-connector to create issue with different 'issueType'
    * @param {string} issueType issueType to create, see ISSUE_TYPE_CODE const.
    * @param {*} createParams params to build JIRA issue fields.
    * @returns {Promise} the newly created issue.
    */
   async createIssue(issueType, createParams) {
      const createIssuePayload = new IssueTemplate(issueType, createParams).template;
      console.log(JSON.stringify(createIssuePayload, null, 2));

      try {
         const issue = await this.jiraClient.issue.createIssue(createIssuePayload);
         console.log("Issue was successfully created with issueType: " + issue.key + "(" + issueType + ")");
         return issue;
      } catch (err) {
         console.dir(err);
         throw new Error("Could not create issue with issueType: " + issueType);
      }
   }

   /**
    * Initializing JIRA client from jira-connector.
    * @returns {object} JiraClient with the configuration.
    */
   getJiraClient() {
      if (this.jiraClientInitialized) {
         return this.jiraClient;
      }

      this.jiraClient = new JiraClient({
         host: this.jiraSettings.url, // jira url, no http.
         basic_auth: {
            username: this.jiraSettings.username,
            password: this.jiraSettings.password
         }
      });
      this.jiraClientInitialized = true;
      return this.jiraClient;
   }

   /* TODO: ask Poornima what if-else block is supposed to do for RFC */
   /* TODO: ask if transition affect rfd or subtask status */
   /* TODO: possible to use transition code name insteand of id ? */
   async _manageRfcTransition(rfcIssue, toTransitionDestId) {
      const rfcIssueStatus = rfcIssue.fields.status.name;
      const rfcIssueKey = rfcIssue.key;
      if (rfcIssueStatus != ISSUE_TRANSITION_NAME.CLOSED) {
         await this.transition(rfcIssueKey, 201);
         this.transition(rfcIssueKey, toTransitionDestId); // TODO why 201 to 81?
      } else {
         this.transition(rfcIssueKey, toTransitionDestId);
      }

      // original code
      // if (rfcIssueStatus != "Closed") {
      //    await self.transition(rfcIssueKey, 201);
      //    await self.transition(rfcIssueKey, 81);
      // } else {
      //    await self.transition(rfcIssueKey, 81);
      // }
   }

   /**
    * Manage the transition for RFD and the subtasks.
    * @param {string} rfdIssueId
    */
   /* TODO: possible to use transition code name insteand of id ? */
   async _manageRfdAndSubtasksTransition(rfdIssueId) {
      const rfdIssue = await this.getIssue(rfdIssueId);
      const rfdIssueStatus = rfdIssue.fields.status.name;
      const rfdSubtaskInfo = rfdIssue.fields.subtasks;

      const rfdSubtask1 = rfdSubtaskInfo[0].key;
      const rfdSubtaskStatus1 = rfdSubtaskInfo[0].fields.status.name;

      const rfdSubtask2 = rfdSubtaskInfo[1].key;
      const rfdSubtaskStatus2 = rfdSubtaskInfo[1].fields.status.name;

      if (rfdIssueStatus != ISSUE_TRANSITION_NAME.SUBMITTED) {
         if (rfdIssueStatus != ISSUE_TRANSITION_NAME.REOPENED) {
            if (rfdIssueStatus == ISSUE_TRANSITION_NAME.RESOLVED) {
               // If status is resolved, Reopen Issue
               this.transition(rfdSubtask1, 951);
               this.transition(rfdSubtask2, 951);
               this.transition(rfdIssueId, 951);
            } else if (rfdIssueStatus == ISSUE_TRANSITION_NAME.CLOSED) {
               // If status is closed, Reopen Issue
               this.transition(rfdSubtask1, 3);
               this.transition(rfdSubtask2, 3);
               //await self.transition(rfdTask, 3);
            } else {
               //Cancel Issue
               await this.transition(rfdIssueId, 921);
               //Reopen Issue
               await this.transition(rfdSubtask1, 3);
               await this.transition(rfdSubtask2, 3);
               //await self.transition(rfdTask, 3);
            }
         }
         //Resubmit Issue
         this.transition(rfdIssueId, 931);
      }

      // jiraClient.issue
      //    .getIssue({ issueKey: rfdTaskId })
      //    .then(function(result) {
      //       return result.fields.subtasks;
      //    })
      //    .then(async rfdSubtaskInfo => {
      //       const rfdSubtask1 = rfdSubtaskInfo[0].key;
      //       const rfdSubtaskStatus1 = rfdSubtaskInfo[0].fields.status.name;

      //       const rfdSubtask2 = rfdSubtaskInfo[1].key;
      //       const rfdSubtaskStatus2 = rfdSubtaskInfo[1].fields.status.name;

      //       if (rfdTaskStatus != "Submitted") {
      //          if (rfdTaskStatus != "Reopened") {
      //             if (rfdTaskStatus == "Resolved") {
      //                // If status is resolved, Reopen Issue
      //                self.transition(rfdSubtask1, 951);
      //                self.transition(rfdSubtask2, 951);
      //                self.transition(rfdTaskId, 951);
      //             } else if (rfdTaskStatus == "Closed") {
      //                // If status is closed, Reopen Issue
      //                self.transition(rfdSubtask1, 3);
      //                self.transition(rfdSubtask2, 3);
      //                //await self.transition(rfdTask, 3);
      //             } else {
      //                //Cancel Issue
      //                await self.transition(rfdTaskId, 921);
      //                //Reopen Issue
      //                await self.transition(rfdSubtask1, 3);
      //                await self.transition(rfdSubtask2, 3);
      //                //await self.transition(rfdTask, 3);
      //             }
      //          }
      //          //Resubmit Issue
      //          self.transition(rfdTaskId, 931);
      //       }
      //    });
   }
} //end Jira class

/**
 * The template for creating JIRA Issue.
 */
class IssueTemplate {
   constructor(type, params) {
      this.template = {
         fields: {
            project: { key: params.projectName },
            issuetype: { name: type },
            customfield_10121: { value: params.env },

            // RFD type specific fields/values.
            ...(type === ISSUE_TYPE_CODE.RFD && {
               labels: [params.projectName],
               fixVersions: [{ name: params.version }],
               description: `Deploying changes from PR NO: ${params.branchName} in REPO: ${params.repoName}`,
               summary: `RFD-${params.env}-${params.changeBranch}-${params.branchName}`
            }),

            // RFD-subtask type specific fields/values.
            ...(type === ISSUE_TYPE_CODE.RFD_SUBTASK && {
               parent: { key: params.rfdIssueKey },
               summary: `RFD-Subtask-${params.env}-${params.changeBranch}-${params.branchName}-${params.reviewer}-Review`,
               components: [{ name: params.repoName }]
            })
         }
      };
   }

   // sampel RFD
   /*
   {
      "fields": {
        "project": {
          "key": "SAMPLE"
        },
        "issuetype": {
          "name": "RFD"
        },
        "customfield_10121": {
          "value": "PROD"
        },
        "labels": [
          "SAMPLE"
        ],
        "fixVersions": [
          {
            "name": "1.1.0"
          }
        ],
        "description": "Deploying changes from PR NO: SAMPLE-1284-test-branch in REPO: spi-wiof-ear",
        "summary": "RFD-PROD-SAMPLE-1284-test-branch-SAMPLE-1284-test-branch"
      }
    }
    */
   // sample RFD-subtask
   /*
   {
      "fields": {
        "project": {
          "key": "SAMPLE"
        },
        "issuetype": {
          "name": "RFD-subtask"
        },
        "customfield_10121": {
          "value": "PROD"
        },
        "parent": {
          "key": "SAMPLE-1394"
        },
        "summary": "RFD-Subtask-PROD-SAMPLE-1284-test-branch-SAMPLE-1284-test-branch-Business-Review",
        "components": [
          {
            "name": "spi-wiof-ear"
          }
        ]
      }
    }
    */
}

module.exports = Jira;
