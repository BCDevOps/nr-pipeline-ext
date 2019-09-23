'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const Jira = require('./Jira')
const config = require(`${process.cwd()}/lib/config.js`)
const env = config.options.env

module.exports = class {
  constructor(settings){
    this.settings=settings;
  }
  /**
   * returns an array on openshift resources
   */
  processTemplates(oc){
    
  }

  async build(){

    const settings= this.settings;
    const phases = settings.phases
    const oc = new OpenShiftClientX(Object.assign({ namespace: phases.build.namespace }, settings.options));
    const phase = 'build';
    const objects = this.processTemplates(oc);

    oc.applyRecommendedLabels(objects, phases[phase].name, phase, phases[phase].changeId, phases[phase].instance);
    await oc.applyAndBuild(objects);
  
    // Jira settings
    const jiraUrl = config.jiraUrl
    const username = config.phases[env].credentials.idir.user 
    const password = config.phases[env].credentials.idir.pass 
    const changeBranch = config.options.git.branch.merge
    const branchName = "PR-"+config.options.pr
    const gitUrl = config.options.git.url
    const changeTarget = config.options.git.change.target
  
    const elements = gitUrl.split('/')
    const issueElements = changeBranch.split('-')
    const projectName = issueElements[0].toUpperCase()
    const repoName = elements[7].split('.')[0]
    const key= changeBranch.split('-')
    const rfcIssueKey = key[0]+'-'+key[1]
  
    if (changeTarget.toLowerCase() == 'master'){
      const jiraSettings= { url: jiraUrl, username: username, password: password, rfcIssueKey:rfcIssueKey, changeBranch:changeBranch, branchName:branchName, repoName: repoName, projectName: projectName}
  
      // Create the jira object of the type Jira 
      const jira = new Jira(Object.assign({ phase: 'jira-update', jira: jiraSettings}))
      jira.createRFD()  
    }
  }
}