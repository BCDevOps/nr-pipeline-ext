'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const Jira = require('./Jira');
const CONST = require('./constants');
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
    const settings = this.settings
    const phases = settings.phases
    const options= settings.options
    const phase=settings.phase
    const changeId = phases[phase].changeId
    const oc=new OpenShiftClientX(Object.assign({ namespace: phases[phase].namespace }, options));
    const objects = this.processTemplates(oc);

    oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
    oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
    await oc.applyAndDeploy(objects, phases[phase].instance)
    await this.jiraTransition()
  }
    
  async jiraTransition(){
    // Jira settings
    const env = config.options.env
    const jiraUrl = config.jiraUrl
    const username = config.phases[env].credentials.idir.user 
    const password = config.phases[env].credentials.idir.pass 
    
    const changeBranch = config.options.git.branch.merge
    
    const key= changeBranch.split('-')
    const rfcIssueKey = key[0]+'-'+key[1]


    if (env.toLowerCase() != 'dev'){

      const jiraSettings= { 
            url: jiraUrl, 
            username: username, 
            password: password, 
            rfcIssueKey:rfcIssueKey
      }
      this.jiraClient = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings}))
      
      // transition RFDs/Subtasks
      await this.transitionRfdAndSubtasksToResolved(rfcIssueKey, env);      
    }
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
    const onTargetEnvRfdIssueKeys = await this.jiraClient.getRfdTaskIds(rfcIssueKey, jiraTargetEnv);
    for (let rfdIssuekey of onTargetEnvRfdIssueKeys) {
      const rfdSubtaskInfo = await this.jiraClient.getIssueSubtasksInfo(rfdIssuekey);
      await this.jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);
      await this.jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 

      for (let subTask of rfdSubtaskInfo){
        const subtaskIssuekey = subTask.key
        await this.jiraClient.transition(subtaskIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 
        await this.jiraClient.transition(subtaskIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.RESOLVE); 
      }
    }
  }
  
}

