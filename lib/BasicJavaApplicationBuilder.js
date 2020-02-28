'use strict';
const {OpenShiftClientX} = require('@bcgov/pipeline-cli')
const Jira = require('./Jira')
const Git = require('../lib/GitOperation')

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
    Object.assign(settings.options.git, {credentials: {'username':username,'password':password}})
    const changeBranch = settings.options.git.branch.merge
    const gitUrl = settings.options.git.url
    const gitElements = gitUrl.split('/')
    const repoName = gitElements[7].split('.')[0]
    
    const EMPTY = '';
    let changeTarget=(settings.options.git.change != undefined)? 
                      (settings.options.git.change.target != undefined? settings.options.git.change.target.trim() : EMPTY) :
                      EMPTY;
                
    if(changeTarget && changeTarget.toLowerCase() == 'master') {
      // Build for target = 'master'

      const jiraUrl = settings.jiraUrl;
      const branchName = "PR-"+settings.options.pr;

      await this._createJiraAutoRFDs(jiraUrl, repoName, changeBranch, branchName, username, password);

      await this._gitTargetSyncVerify();
    }
    else if (changeTarget != EMPTY) {
      // Build for target = 'other branch'

      await this._gitTargetSyncVerify();
    }

    const oc = new OpenShiftClientX(Object.assign({ namespace: phases.build.namespace }, settings.options));
    const processedTemplate = this.processTemplates(oc);
    const phase = settings.phase;
    oc.applyRecommendedLabels(processedTemplate, phases[phase].name, phase, 
                                  phases[phase].changeId, phases[phase].instance);
    oc.applyAndBuild(processedTemplate);
    const git = new Git(this.settings.options.git);
    await git.clear()
  } // end build

  /**
   * Calling Git module to verify if both change/target branches are not out of sync.
   */
  async _gitTargetSyncVerify() {
    const git = new Git(this.settings.options.git);
    if(await git.isTargetBranchOutofSync()){
      console.log("Successfully Verified that branch is not out of sync with target")
    }
  }

  /**
   * This create JIRA RFDs labled with 'auto' to be used only for our pipeiline deployment.
   * It creates 1 auto RFD for each environment for DLVR, TEST, PROD.
   */
  async _createJiraAutoRFDs(jiraUrl, repoName, changeBranch, branchName, username, password) {
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

    const jira = new Jira(Object.assign({ phase: 'jira-update', jira: jiraSettings}))
    await jira.createRFD()  
  }
}
