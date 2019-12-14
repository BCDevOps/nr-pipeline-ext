'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const Jira = require('./Jira')
const Git = require('../lib/GitVerification')

module.exports = class {
  constructor(settings) {
    this.settings=settings;
  }
  /**
   * returns an array on openshift resources
   */
  processTemplates(oc) {
  }

  async build() {
    const settings= this.settings;
    const phases = settings.phases
    const env = 'build'
    const username = settings.phases[env].credentials.idir.user
    const password = settings.phases[env].credentials.idir.pass

    const changeBranch = settings.options.git.branch.merge
    const gitUrl = settings.options.git.url
    const gitElements = gitUrl.split('/')
    const repoName = gitElements[7].split('.')[0]
  
    const changeTarget=settings.options.git.change.target;
    if(changeTarget.toLowerCase() == 'master') {
      const jiraUrl = settings.jiraUrl
      const branchName = "PR-"+settings.options.pr

      const issueElements = changeBranch.split('-')
      const key= changeBranch.split('-')
      const rfcIssueKey = key[0]+'-'+key[1]
      const projectName = issueElements[0].toUpperCase()

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

      // Create the jira object of the type Jira 
      const jira = new Jira(Object.assign({ phase: 'jira-update', jira: jiraSettings}))
      jira.createRFD()  
    }
    else {
        console.log("Change Target is not Master, therefore, no changes will be made to Jira")
    }

    const git = new Git();
    return git.verify(changeBranch, changeTarget, 
                         username, password, gitUrl).then(result => {
      if(result=='True') {
        console.log("Successfully Verified if branch is out of sync from target")

        const oc = new OpenShiftClientX(Object.assign({ namespace: phases.build.namespace }, settings.options));
        const processedTemplate = this.processTemplates(oc);
        const phase = settings.phase;
        oc.applyRecommendedLabels(processedTemplate, phases[phase].name, phase, 
                                  phases[phase].changeId, phases[phase].instance);
        oc.applyAndBuild(processedTemplate);
      }
    });
    
  } // end build
}
