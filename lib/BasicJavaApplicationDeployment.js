'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const path = require('path');
const Jira = require('../index').Jira;
const CONST = require('../index').CONST;
const config = require(`${process.cwd()}/lib/config.js`)


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

module.exports = async (settings)=>{
  const phases = settings.phases
  const options= settings.options
  const phase=settings.phase
  const changeId = phases[phase].changeId
  const oc=new OpenShiftClientX(Object.assign({ namespace: phases[phase].namespace }, options));

  const templatesLocalBaseUrl =oc.toFileUrl(path.resolve(__dirname, '../../openshift'))
  var objects = []

  objects.push(... oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/wiof-deploy.yaml`, {
    'param':{
      'NAME': phases[phase].name,
      'SUFFIX': phases[phase].suffix,
      'VERSION': phases[phase].tag,
      'HOST': phases[phase].host
    }
  }));

  oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
  oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
  await oc.applyAndDeploy(objects, phases[phase].instance)
}
if (env.toLowerCase() != 'dev'){

const jiraSettings= { url: jiraUrl, username: username, 
  password: password, 
  rfcIssueKey:rfcIssueKey, 
  changeBranch:changeBranch, 
  branchName:branchName, 
  repoName: repoName, 
  projectName: projectName}
const jiraClient = new Jira(Object.assign({ phase: 'jira-update', jira: jiraSettings}))

// transition RFDs/Subtasks

  transitionRfdAndSubtasksToResolved(jiraClient, rfcIssueKey, env)
    .then((resolve) => {
      console.log("done!")
    });

async function transitionRfdAndSubtasksToResolved(jiraClient, rfcIssueKey, env) {
  if(env === CONST.ENV.DLVR){
    await transitionRfdAndSubtasksToResolvedOnTargetEnv(jiraClient, rfcIssueKey, CONST.JIRA_TARGET_ENV.DLVR);
  }
  else if(env === CONST.ENV.TEST){
    await transitionRfdAndSubtasksToResolvedOnTargetEnv(jiraClient, rfcIssueKey, CONST.JIRA_TARGET_ENV.TEST);
  }
  else if(env === CONST.ENV.PROD){
    await transitionRfdAndSubtasksToResolvedOnTargetEnv(jiraClient, rfcIssueKey, CONST.JIRA_TARGET_ENV.PROD);
}
}

async function transitionRfdAndSubtasksToResolvedOnTargetEnv(jiraClient, rfcIssueKey, jiraTargetEnv) {
const targetOnEnvRfdIssueKeys = await jiraClient.getRfdTaskIds(rfcIssueKey, jiraTargetEnv);
for (let rfdIssuekey of targetOnEnvRfdIssueKeys) {
const rfdSubtaskInfo = await jiraClient.getIssueSubtasksInfo(rfdIssuekey);
await jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);
await jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 
// TODO: verify workflow transition correctness and possible other scenarios.
//for (let subTask of rfdSubtaskInfo){
//await jiraClient.transition(subTask.key, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);
//}
//await jiraClient.transition(rfdIssuekey, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);

for (let subTask of rfdSubtaskInfo){
const subtaskId = subTask.key
await jiraClient.transition(subtaskId, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS); 
await jiraClient.transition(subtaskId, CONST.ISSUE_TRANSITION_ACTION_NAME.RESOLVE); 
}
}
}
}

