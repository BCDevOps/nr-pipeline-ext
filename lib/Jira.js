// import JiraClient from "jira-connector"; // node does not support ES6 import yet in year 2019.
// ref: https://timonweb.com/tutorials/how-to-enable-ecmascript-6-imports-in-nodejs/

"use strict";
const JiraClient = require("jira-connector");
const CONST = require("./constants");

const REVIEWER_ENV_MAP = CONST.REVIEWER_ENV_MAP;
const ISSUE_TYPE_CODE = CONST.ISSUE_TYPE_CODE;
const ISSUE_STATUS_NAME = CONST.ISSUE_STATUS_NAME
const ISSUE_TRANSITION_ACTION_NAME = CONST.ISSUE_TRANSITION_ACTION_NAME

/**
 * This class handles RFC and RFD creation,  and other utility functions
 * based on current RFC/RFD workflow.
 */
class Jira {
   constructor(settings) {
      this.jiraSettings = settings.jira;
      this.jiraClientInitialized = false; // depends on jira-connector:JiraClient.
      this.rfcIssueInitialized = false; // depends on if RFC issue can be retrieved.
   }

   /**
    * Function ensures the RFD issues are created and linked to RFC issue for each environment.
    * Also ensure RFC/RFD/RFD subtasks status  to the state intended.
    */
   async createRFD() {
      const rfcIssueKey = this.jiraSettings.rfcIssueKey;
      const self = this;

      // Retrieving RFC issue info
      const rfcIssue = await this.retrieveRfcIssueInfo(this.jiraSettings.rfcIssueKey);
      this.rfcIssue = rfcIssue;
      
      // Initialize JIRA component (if not exists)
      const projectName = this.jiraSettings.projectName;
      const repoName = this.jiraSettings.repoName;
      const changeBranch = this.jiraSettings.changeBranch;
      await this.initializeProjectComponent(projectName, repoName);
      var containRfcToRfdLinks = 0

      var rfdIssueLinks = []
      for ( var i in rfcIssue.fields.issuelinks){
         if(rfcIssue.fields.issuelinks[i].type.name == "RFC-RFD"){
            containRfcToRfdLinks+=1
            rfdIssueLinks.push(rfcIssue.fields.issuelinks[i].outwardIssue.key)
         }
      }
      let containsAutomatedRfdIssueLinks = 0
      for (var key in rfdIssueLinks){
         var rfdIssueInfo = await this.getIssue(rfdIssueLinks[key])
         if(rfdIssueInfo.fields.labels.includes("auto")){
            containsAutomatedRfdIssueLinks+=1
         }
         else {
            await this.editIssue(rfdIssueLinks[key],repoName,changeBranch)
         }
      }
        //console.log(containsAutomatedRfdIssueLinks)
      //const containsIssueLinks = rfcIssue.fields.issuelinks != undefined && rfcIssue.fields.issuelinks.length > 0;
      if (!containsAutomatedRfdIssueLinks) {
         console.log("No automated RFD issueLinks found for RFC issue: " + rfcIssueKey);
         
         const branchName = this.jiraSettings.branchName;
         const self = this;

         // loop for each env.
         for (let [jiraTargetEnv, reviewer] of REVIEWER_ENV_MAP) {
            // new RFD created.
            //await self.editIssue(rfcIssueKey,repoName)
            const newRfdIssue = await self.createRfdAndLinkToRfc(rfcIssueKey, projectName, repoName, changeBranch, branchName, jiraTargetEnv);
            const rfdIssueKey = newRfdIssue.key;
            const rfdSubtasks = await self.createRfdSubtasks(rfdIssueKey, projectName, repoName, changeBranch, branchName, jiraTargetEnv, reviewer);
         }

      } else {
         await self._manageRfcTransitionToInitialState(this.rfcIssue);
          for ( var i in rfcIssue.fields.issuelinks){
              if(rfcIssue.fields.issuelinks[i].type.name == "RFC-RFD" ){
                  var rfdIssueInfo = await this.getIssue(rfcIssue.fields.issuelinks[i].outwardIssue.key)
                  if (rfdIssueInfo.fields.labels.includes("auto")){
                   await self._manageRfdAndSubtasksTransitionToInitialState(rfcIssue.fields.issuelinks[i].outwardIssue.key);
                  }
               }
          }   
      }
   }

   /**
    * RFD subtasks (for now we set it for 2 will be created) will be creted for the RFD.
    * After they are being created the subtasks will be also transitioned to Submitted.
    * @param {*} rfdIssueKey parent issueKey
    * @param {*} projectName JIRA create param
    * @param {*} repoName JIRA create param
    * @param {*} changeBranch JIRA create param
    * @param {*} branchName JIRA create param
    * @param {*} jiraTargetEnv set the "Target environment" on JIRA (this is custom field - customfield_10121)
    * @param {*} reviewer JIRA create param
    */
   async createRfdSubtasks(rfdIssueKey, projectName, repoName, changeBranch, branchName, jiraTargetEnv, reviewer) {
      // 2 new RFD subtasks created.
         const rfdSubTaskIssue = await this.createIssue(ISSUE_TYPE_CODE.RFD_SUBTASK, {
            projectName: projectName,
            env: jiraTargetEnv,
            rfdIssueKey: rfdIssueKey,
            changeBranch: changeBranch,
            branchName: branchName,
            reviewer: reviewer,
            repoName: repoName
         });
         await this.transition(rfdSubTaskIssue.key, ISSUE_TRANSITION_ACTION_NAME.SUBMIT); // 731 submitted
   }

   /**
    * RFD will be created and linked to it's RFC.
    * After it is created rfd will be also transitioned to Submitted.
    * @param {*} rfcIssueKey the RFC to be linked to
    * @param {*} projectName JIRA create param
    * @param {*} repoName JIRA create param
    * @param {*} changeBranch JIRA create param
    * @param {*} branchName JIRA create param
    * @param {*} jiraTargetEnv set the "Target environment" on JIRA (this is custom field - customfield_10121)
    */
   async createRfdAndLinkToRfc(rfcIssueKey, projectName, repoName, changeBranch, branchName, jiraTargetEnv) {
      console.log("createRfdAndLinkToRfc() with rfcIssueKey: " + rfcIssueKey);

      const rfcIssue = await this.retrieveRfcIssueInfo(rfcIssueKey);
      const rfcIssueVersion = rfcIssue.fields.fixVersions[0].name;

      // new RFD created.
      const newRfdIssue = await this.createIssue(ISSUE_TYPE_CODE.RFD, {
         version: rfcIssueVersion,
         projectName: projectName,
         env: jiraTargetEnv,
         changeBranch: changeBranch,
         branchName: branchName,
         repoName: repoName
      });

      //issue link between RFD and RFC
      const jiraClient = this.getJiraClient();
      const rfdIssueKey = newRfdIssue.key;
      jiraClient.issueLink.createIssueLink({
         issueLink: {
            type: { id: "10300" },
            inwardIssue: { key: rfcIssueKey },
            outwardIssue: { key: rfdIssueKey }
         }
      });

      await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.SUBMIT); // 731 submitted
      return newRfdIssue;
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
         });
         console.log("JIRA component was created with: " + projectName + " for project: " + projectName);
         return newComponent;
      }
      return true;
   }

   /**
    * Async wrapper function to retrieve RFC issue.
    * @param {string} rfcIssueKey
    * @return {Promise} Resolved with RFC issue data.
    */
   async retrieveRfcIssueInfo(rfcIssueKey) {
      if (rfcIssueKey == undefined || rfcIssueKey == null) {
         throw new Error("Missing 'rfcIssueKey' argument");
      }
      if (this.rfcIssueInitialized) {
         return this.rfcIssue;
      }

      console.log("Retrieving RFC issue with issueKey: " + rfcIssueKey);
      return this.getIssue(rfcIssueKey);
   }

   /**
    * Transitioning issue @issueKey using @transitionAction to some target status.
    * The function first search possible transtion status from JIRA client before making the .
    * If the transitionAction can be found, it will use the "id" to make the  through JIRA.
    * If the transitionAction is not found for this issue, error will be thrown.
    * @param {string} issueKey
    * @param {number} transitionAction the name/code of the action to .
    *                 Note, this is not the 'status' code/name; it is the 'action' to  to other status.
    */
   async transition(issueKey, transitionAction) {
      try {
         let issue = await this.getIssue(issueKey);
         //console.log("~Before  - Issue: " + issueKey + ", status: " + issue.fields.status.name);

         // based on issueKey, finding possible actions to  from JIRA client
         //console.log("Transitioning " + issueKey + " with action: " + transitionAction);
         const possibleTransitionsReturn = await this.jiraClient.issue.getTransitions({ issueKey: issueKey });
         const possibleActions = possibleTransitionsReturn.transitions;
         if (possibleActions == undefined || possibleActions.length == 0) {
            throw new Error(
               "Could not found possible ''. Could not transtion issue: " +
                  issueKey +
                  " based on current issue status. Possibly the  does not exist or cannot be performed on the issue."
            );
         }
         //console.log("Possible actions to : ");
         //console.log(possibleActions);

         // checking if user's  action is valid
         var foundTransition = possibleActions.find(t => t.name == transitionAction);
         if (foundTransition === undefined) {
            const possibleTreansitionActionName = possibleActions.map(t => t.name);
            throw new Error("Could not '" + transitionAction + "' issue. Only these actions are possible: " + possibleTreansitionActionName);
         }

         // transition using the id found from JIRA client
         const transitionId = foundTransition.id;
         //console.log(issueKey + " is transitioning with action: " + transitionAction + "(" + transitionId + ")");
         const response = await this.jiraClient.issue.transitionIssue({
            issueKey: issueKey,
            transition: { id: transitionId }
         });
         //console.log("Successfully " + transitionAction + "(" + transitionId + ")" + " issueKey: " + issueKey);

         issue = await this.getIssue(issueKey);
         console.log("~After transition - Issue: " + issueKey + ", status: " + issue.fields.status.name);

         return response; // it actually is empty "" from JIRA when succeeded.
      } catch (err) {
         console.dir(err);
         throw new Error("Could not " + transitionAction + " for issueKey: " + issueKey);
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
         //console.log("Issue are successfully retrieved for issueKey: " + issueKey);
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
      //console.log(JSON.stringify(createIssuePayload, null, 2));

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

   /**
    * Get the RFD task(s) issueKeys from RFC for the 'env'.
    * Note, current filter stratgy is based on the assumption that the summary field
    * contain 'env' text on exact match.
    * @param {string} rfcIssueKey the parent RFC ticket issueKey
    * @param {string} jiraTargetEnv this is the text ('env') to be filtered on (and is defined in constants.js)
    * @return {Promise/array} array of rfdIssueKeys if exists. If it has item, usually it only contains 1 issue in each env.
    */
   getRfdTaskIds(rfcIssueKey, jiraTargetEnv) {
      return this.retrieveRfcIssueInfo(rfcIssueKey)
         .then(async (rfcIssue) => {
            var rfcIssue = rfcIssue
               let rfdIssueKeys = [];
               for(var i in rfcIssue.fields.issuelinks) { 
                  if(rfcIssue.fields.issuelinks[i].type.name == "RFC-RFD"){                  
                     var rfdIssueInfo = await this.getIssue(rfcIssue.fields.issuelinks[i].outwardIssue.key)
                     if(rfdIssueInfo.fields.labels.includes("auto") && rfcIssue.fields.issuelinks[i].outwardIssue.fields.summary.includes(jiraTargetEnv)) {
                           rfdIssueKeys.push(rfcIssue.fields.issuelinks[i].outwardIssue.key);
                         } 
                     }
                  }
               //console.log(rfdIssueKeys)
               console.log("RFC " + rfcIssueKey + ", target env: "+ jiraTargetEnv + ", contains these RFDs: " + rfdIssueKeys)
               return Promise.resolve(rfdIssueKeys);
      });
   }

   /**
    * Obtain subtasks for the issue.
    * @param {string} issueId to get the subtasks from
    * @return {Promise} subtasks array object infomation.
    */
   getIssueSubtasksInfo(issueId) {
      return this.getIssue(issueId)
         .then(issueInfo => issueInfo.fields.subtasks);
   }

   async _manageRfcTransitionToInitialState(rfcIssue) {
      const rfcIssueStatus = rfcIssue.fields.status.name;
      const rfcIssueKey = rfcIssue.key;
      if(rfcIssueStatus == ISSUE_STATUS_NAME.OPENFORINT){
         return;
      }
      else if (rfcIssueStatus != ISSUE_STATUS_NAME.CLOSED) {
         await this.transition(rfcIssueKey, ISSUE_TRANSITION_ACTION_NAME.CANCEL); // 201
         await this.transition(rfcIssueKey, ISSUE_TRANSITION_ACTION_NAME.REOPEN);
            // 81
      } else {
         await this.transition(rfcIssueKey, ISSUE_TRANSITION_ACTION_NAME.REOPEN); // 81
      }
   }

   /**
    * Manage the transition for RFD and the subtasks.
    * @param {string} rfdIssueKey
    */
   async _manageRfdAndSubtasksTransitionToInitialState(rfdIssueKey) {
      console.log("Manage RFD and subtasks transition for RFD issue: " + rfdIssueKey)
      const rfdIssue = await this.getIssue(rfdIssueKey);
      const rfdIssueStatus = rfdIssue.fields.status.name;
      console.log("RFD issue status: " + rfdIssueStatus)
      //let doTransitionForSubtasks = true; // default

      if (rfdIssueStatus == ISSUE_STATUS_NAME.SUBMITTED) {
         //no-op
      }else if (rfdIssueStatus == ISSUE_STATUS_NAME.REOPENED) {
         //re-submit
         await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.RESUBMIT);
      }else if (
            (rfdIssueStatus == ISSUE_STATUS_NAME.RESOLVED)
         || (rfdIssueStatus == ISSUE_STATUS_NAME.CLOSED)
      ) {
         //re-open, and re-submit
         
         try{
            await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.REOPEN_ISSUE);
         }
         catch(err){
            await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.REOPEN);
         }
         await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.RESUBMIT); 
         
/* 
         // If status is closed, Reopen Issue, recreated new ones
         const rfcIssueKey = rfdIssue.fields.issuelinks[0].inwardIssue.key;
         const jiraTargetEnv = rfdIssue.fields.customfield_10121.value; // this is a custime field to get "Target environment" on JIRA
         const reviewer = CONST.REVIEWER_ENV_MAP.get(jiraTargetEnv);
         const projectName = this.jiraSettings.projectName;
         const repoName = this.jiraSettings.repoName;
         const changeBranch = this.jiraSettings.changeBranch;
         const branchName = this.jiraSettings.branchName;
         // TODO should we take the same summary to set instead of all argument?
         const newRfdIssue = await this.createRfdAndLinkToRfc(rfcIssueKey, projectName, repoName, changeBranch, branchName, jiraTargetEnv);
         const newRfdIssueKey = newRfdIssue.key;
         const newRfdSubtasks = await this.createRfdSubtasks(rfdIssueKey, projectName, repoName, changeBranch, branchName, jiraTargetEnv, reviewer);
         doTransitionForSubtasks = false; // newly created subtasks are already in submitted status */

      } else {
         await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.CANCEL);
         try{
            await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.REOPEN_ISSUE);
            }
            catch(err){
               await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.REOPEN);
            }
         await this.transition(rfdIssueKey, ISSUE_TRANSITION_ACTION_NAME.RESUBMIT); 

         //throw new Error(`Can't handle RFD in status ${rfdIssueStatus}`);
      }

      //if (doTransitionForSubtasks) {
         for (let rfdSubTask of rfdIssue.fields.subtasks){
            await this._manageRfdAndSubtasksTransitionToInitialState(rfdSubTask.key)
         }
      //}

   }

   // Transition RFD post Deployment

   async transitionRFDpostDeployment(env){
      // Jira settings
      
      const jiraUrl = this.jiraSettings.url
      const username = this.jiraSettings.username
      const password = this.jiraSettings.password
      const rfcIssueKey = this.jiraSettings.rfcIssueKey
        
        // transition RFDs/Subtasks
        await this.transitionRfdAndSubtasksToResolved(rfcIssueKey, env);      
      }
  
    async transitionRfdAndSubtasksToResolved(rfcIssueKey, env) {
  
      if(env === CONST.ENV.DLVR){
        await this.transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.DLVR);
      }
      else if(env === CONST.ENV.TEST){
        await this.transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.TEST);
      }
      else if(env === CONST.ENV.PROD){
        await this.transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.PROD);
      }
    }
          
    async transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, jiraTargetEnv) {
      const onTargetEnvRfdIssueKeys = await this.getRfdTaskIds(rfcIssueKey, jiraTargetEnv);
      for (let rfdIssuekey of onTargetEnvRfdIssueKeys) {
        const rfdSubtaskInfo = await this.getIssueSubtasksInfo(rfdIssuekey);
        await this.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);
        await this.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 
  
        for (let subTask of rfdSubtaskInfo){
          const subtaskIssuekey = subTask.key
          await this.transition(subtaskIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 
          await this.transition(subtaskIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.RESOLVE); 
        }
      }
    }
    async editIssue(issueKey, repoName, changeBranch){
      var issueInfo = await this.getIssue(issueKey)
      if(issueInfo.fields.labels.includes("auto")){
         //pass
      }
      else if(issueInfo.fields.labels.includes("repo") && issueInfo.fields.labels.includes("branch")){
        //pass
      }
      else{
         const editIssuePayload = {
            issueKey: issueKey,
            issue:{
              update: {
                labels: [{ add: `repo:${repoName}`}, {add: `branch:${changeBranch}`}]
              }
           } 
         }
            const issue = await this.jiraClient.issue.editIssue(editIssuePayload);
            console.log("Issue Label was successfully editted with issue key : " + issueKey);
      }
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
               labels: [params.projectName, "auto", `repo:${params.repoName}`, `branch:${params.changeBranch}`],
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

}

module.exports = Jira;