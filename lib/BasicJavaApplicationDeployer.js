'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const Jira = require('./Jira');
const CONST = require('./constants');
const Verifier = require('./InputDeployerVerify');
const config = require(`${process.cwd()}/lib/config.js`);


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

    if(env.toLowerCase() != 'dev' && env.toLowerCase() != 'sbox' && env.toLowerCase() != 'sandbox')
    {
      const verify=new Verifier(Object.assign(this.settings));
      const verifyStatus = await verify.verifyBeforeDeployment();
      if(verifyStatus==="Ready"){
    
        await this.deployOpenshift()
    
      const jiraUrl = config.jiraUrl
      const username = config.phases[env].credentials.idir.user 
      const password = config.phases[env].credentials.idir.pass 
      const changeBranch = config.options.git.branch.merge
      const key= changeBranch.split('-')
      const rfcIssueKey = key[0]+'-'+key[1]

      const jiraSettings= { 
        url: jiraUrl, 
        username: username, 
        password: password, 
        rfcIssueKey:rfcIssueKey
       }
    
        // Create the jira object of the type Jira 
        const jira = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings}))
        jira.transitionRFDpostDeployment(env)
      }
    }
    else{
      this.deployOpenshift()
    }   
  }

  async deployOpenshift(){
    const settings = this.settings
    const phases = settings.phases
    const options= settings.options
    const phase=settings.phase
    const env = config.options.env
    const changeId = phases[phase].changeId
    const oc=new OpenShiftClientX(Object.assign({ namespace: phases[phase].namespace }, options));
    const objects = this.processTemplates(oc);

    

    oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
    oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
    await oc.applyAndDeploy(objects, phases[phase].instance) 
  
   
  }   
}

