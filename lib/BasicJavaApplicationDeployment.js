'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const path = require('path');
const Jira = require('../index').Jira;
const CONST = require('../index').CONST;
const config = require(`${process.cwd()}/lib/config.js`)

module.exports = class {
  constructor(settings){
    this.settings=settings;
  }

    /**
   * returns an array on openshift resources
   */
  processTemplates(oc){
    
  }

  async deploy() {

    const env = config.options.env
    // Jira settings
    const jiraUrl = config.jiraUrl
    const username = config.phases[env].credentials.idir.user 
    const password = config.phases[env].credentials.idir.pass 
    const changeBranch = config.options.git.branch.merge
    const branchName = "PR-"+config.options.pr
    
    const key= changeBranch.split('-')
    const rfcIssueKey = key[0]+'-'+key[1]
    const gitUrl = config.options.git.url
    const elements = gitUrl.split('/')
    const projectName = elements[6].toUpperCase()
    const repoName = elements[7].split('.')[0]

    if (env.toLowerCase() != 'dev'){

      const jiraSettings= { 
            url: jiraUrl, 
            username: username, 
            password: password, 
            rfcIssueKey:rfcIssueKey, 
            changeBranch:changeBranch, 
            branchName:branchName, 
            repoName: repoName, 
            projectName: projectName
      }
      this.jiraClient = new Jira(Object.assign({ phase: 'jira-update', jira: jiraSettings}))
      
      // transition RFDs/Subtasks
      await transitionRfdAndSubtasksToResolved(rfcIssueKey, env);      
    }
  }

  async transitionRfdAndSubtasksToResolved(rfcIssueKey, env) {
    if(env === CONST.ENV.DLVR){
      await transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.DLVR);
    }
    else if(env === CONST.ENV.TEST){
      await transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.TEST);
    }
    else if(env === CONST.ENV.PROD){
      await transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.PROD);
    }
  }
        
  async transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, jiraTargetEnv) {
    const onTargetEnvRfdIssueKeys = await this.jiraClient.getRfdTaskIds(rfcIssueKey, jiraTargetEnv);
    for (let rfdIssuekey of onTargetEnvRfdIssueKeys) {
      const rfdSubtaskInfo = await jiraClient.getIssueSubtasksInfo(rfdIssuekey);
      await jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);
      await jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 

      for (let subTask of rfdSubtaskInfo){
        const subtaskIssuekey = subTask.key
        await jiraClient.transition(subtaskIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 
        await jiraClient.transition(subtaskIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.RESOLVE); 
      }
    }
  }
  
}

