"use strict";
const path = require('path');
const Jira = require('./Jira');
const config = require(`${process.cwd()}/lib/config.js`)
const CONST = require("./constants");

async function verifyBeforeDeployment() {

    const env = config.options.env
    const jiraUrl = config.jiraUrl
    const username = config.phases[env].credentials.idir.user 
    const password = config.phases[env].credentials.idir.pass 
    const changeBranch = config.options.git.branch.merge
    console.log(changeBranch)
    const key= changeBranch.split('-')
    const rfcIssueKey = key[0]+'-'+key[1]

    const jiraSettings= { 
      url: jiraUrl, 
      username: username, 
      password: password, 
      rfcIssueKey:rfcIssueKey
     }
  
      // Create the jira object of the type Jira 
      const jiraClient = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings}))
      const rfcIssue = await jiraClient.retrieveRfcIssueInfo(rfcIssueKey);
      var rfdIssueLinks = []
      for ( var i in rfcIssue.fields.issuelinks){
         if(rfcIssue.fields.issuelinks[i].type.name == "RFC-RFD"){
            rfdIssueLinks.push(rfcIssue.fields.issuelinks[i].outwardIssue.key)
         }
      }

      var mapRfdIssueStatus = new Map();
      for (var issue of rfdIssueLinks){
         var rfdInfo = await jiraClient.getIssue(issue)
         if(rfdInfo.fields.customfield_10121.value.toLowerCase()===env.toLowerCase()|| rfdInfo.fields.customfield_10121.value.toLowerCase() === "dev" || rfdInfo.fields.customfield_10121.value.toLowerCase() === "sbox" || rfdInfo.fields.customfield_10121.value.toLowerCase() === "sandbox"){
             mapRfdIssueStatus.set(issue,rfdInfo.fields.status.name)
         }
         }
         var rfcInfo = await jiraClient.getIssue(rfcIssueKey)
         var rfcStatus = rfcInfo.fields.status.name
      var status=null;
      if(Array.from(mapRfdIssueStatus.values()).every( (val, arr) => val ==="Approved") && rfcStatus.toLowerCase()==="authorized for int" ){
          status="Ready"
          for(var i of Array.from(mapRfdIssueStatus.keys())){
               console.log(i, "is Approved")
          }
          console.log (rfcIssueKey, "is", rfcStatus)
      }
      else{
          status="Not Ready"
          for ( var i of mapRfdIssueStatus.keys()){

              if(mapRfdIssueStatus.get(i).toLowerCase()!="approved"){
                   console.log("Status of", i, "is currently ", mapRfdIssueStatus.get(i), "; Approve to continue deploying to ", env.toUpperCase() )
              }
              else {
                  console.log(i," is Approved")
              }
          }
          if((env.toLowerCase()==="dlvr"|| env.toLowerCase()==="int" && rfcStatus.toLowerCase()==="authorized for int") || (env.toLowerCase()==="test" && rfcStatus.toLowerCase()==="authorized for test") || (env.toLowerCase()==="prod" && rfcStatus.toLowerCase()==="authorized for prod") ){
                   
             console.log("RFC", rfcIssueKey,"is authorized to go to", env.toUpperCase() )
          }
          else{
              console.log("Authorize RFC", rfcIssueKey, "to", env.toUpperCase() , "to continue deploying" )
          }
      }
      console.log(status, "for deployment")
 
}

(async function (){
    verifyBeforeDeployment();
})();