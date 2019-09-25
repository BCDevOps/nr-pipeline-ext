"use strict";
const path = require('path');
const Jira = require('./Jira');
const config = require(`${process.cwd()}/lib/config.js`)
const CONST = require("./constants");

module.exports = class {
    constructor(settings){
      this.settings=settings;
    }

async verifyBeforeDeployment() {

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
      // Fetch all rfd Issue links 

      const jiraClient = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings}))
      const rfcIssue = await jiraClient.retrieveRfcIssueInfo(rfcIssueKey);
      var rfdIssueLinks = []
      for ( var i in rfcIssue.fields.issuelinks){
         if(rfcIssue.fields.issuelinks[i].type.name == "RFC-RFD"){
            rfdIssueLinks.push(rfcIssue.fields.issuelinks[i].outwardIssue.key)
         }
      }

      // Create map of RFD tasks and status for current deployment environment
      var mapRfdIssueStatus = new Map();
      var mapRfdAutoIssues = [];
      for (var issue of rfdIssueLinks){
         var rfdInfo = await jiraClient.getIssue(issue)
         if(rfdInfo.fields.customfield_10121.value.toLowerCase()===env.toLowerCase()|| rfdInfo.fields.customfield_10121.value.toLowerCase() === "dev" || rfdInfo.fields.customfield_10121.value.toLowerCase() === "sbox" || rfdInfo.fields.customfield_10121.value.toLowerCase() === "sandbox"){
             mapRfdIssueStatus.set(issue,rfdInfo.fields.status.name)
             if(rfdInfo.fields.labels.includes("auto")){
                 mapRfdAutoIssues.push(issue)
             }
         }
         
      }
         
       // Check if auto RFDs are blocked by other issues
       var mapRfdAutoBlockedIssue = new Map()
       var rfdAutoBlockStatus = []
       var mapRfdAutoIssue = new Map()
       for ( var issue of mapRfdAutoIssues){
           var rfdInfo = await jiraClient.getIssue(issue)
           for (var links of rfdInfo.fields.issuelinks){
              if(links.type.inward==="is blocked by"){
                  mapRfdAutoBlockedIssue.set(issue, Array(links.inwardIssue.key, links.inwardIssue.fields.status.name))
                  rfdAutoBlockStatus.push(links.inwardIssue.fields.status.name)
                  mapRfdAutoIssue.set(issue, rfdInfo.fields.status.name)
              }
           }
       }

       if(mapRfdAutoBlockedIssue.keys(mapRfdAutoBlockedIssue).length!=0){
           if(rfdAutoBlockStatus.every( (val)  => val === "Resolved")){
                 console.log("\n---------------------------  LIST OF BLOCKING ISSUES  ---------------------------\n")
                 for(var rfdIssue of mapRfdAutoBlockedIssue.keys()) {
                   console.log("=> ", rfdIssue, "was blocked by", mapRfdAutoBlockedIssue.get(rfdIssue)[0],"which is RESOLVED" )
                 }
                var rfcInfo = await jiraClient.getIssue(rfcIssueKey)
                var rfcStatus = rfcInfo.fields.status.name
                var status=null;
                if(Array.from(mapRfdAutoIssue.values()).every( (val, arr) => val ==="Approved") && rfcStatus.toLowerCase()==="authorized for int" ){
                      status="Ready"
                      console.log("\n---------------------------     CURRENT ISSUE STATUS    ---------------------------\n")
                      for(var i of Array.from(mapRfdAutoIssue.keys())){
                           console.log('=> ', i, "is Approved")
                      }
                      console.log ("=> ", rfcIssueKey, "is", rfcStatus)
                }
                else{
                     status="Not Ready"
                     for ( var i of mapRfdAutoIssue.keys()){
                         if(mapRfdIssueStatus.get(i).toLowerCase()!="approved"){
                            console.log("\n---------------------------     CURRENT ISSUE STATUS     ---------------------------\n")
                             console.log("=> Status of", i, "is currently ", mapRfdAutoIssue.get(i), "; Approve to continue deploying to ", env.toUpperCase() )
                          }
                         else {
                              console.log("=> ",i," is Approved")
                         }
                     }
                    if((env.toLowerCase()==="dlvr"|| env.toLowerCase()==="int" && rfcStatus.toLowerCase()==="authorized for int") || (env.toLowerCase()==="test" && rfcStatus.toLowerCase()==="authorized for test") || (env.toLowerCase()==="prod" && rfcStatus.toLowerCase()==="authorized for prod") ){
                        console.log("=> RFC", rfcIssueKey,"is authorized to go to", env.toUpperCase() )
                     }
                   else{
                        console.log("=> Authorize RFC", rfcIssueKey, "to", env.toUpperCase() , "to continue deploying" )
                     }
                 }
                 console.log("\n--------------------------- STATUS OF READINESS CHECK FORCDEPLOYMENT  -----------------------------\n")
                 console.log("=>  ", status.toUpperCase(), "FOR DEPLOYMENT")
               return status

            }
           else{
            console.log("\n---------------------------     CURRENT ISSUE STATUS   ---------------------------\n")
              for(var rfdIssue of mapRfdAutoBlockedIssue.keys()) {
                console.log(rfdIssue, "is blocked by", mapRfdAutoBlockedIssue.get(rfdIssue)[0],"which is not resolved yet with current status:",  mapRfdAutoBlockedIssue.get(rfdIssue)[1] )
               }
           }
        }


       else{
         // Check status of RFC and RFD
         console.log("There are no blocked Issues for any automated RFDs")
         var rfcInfo = await jiraClient.getIssue(rfcIssueKey)
         var rfcStatus = rfcInfo.fields.status.name
         var status=null;
         if(Array.from(mapRfdIssueStatus.values()).every( (val, arr) => val ==="Approved") && rfcStatus.toLowerCase()==="authorized for int" ){
            status="Ready"
            console.log("\n---------------------------     CURRENT ISSUE STATUS     ---------------------------\n")
             for(var i of Array.from(mapRfdIssueStatus.keys())){
               console.log("=> ",i, "is Approved")
             }
            console.log ("=> ", rfcIssueKey, "is", rfcStatus)
         }
         else{
            status="Not Ready"
            for ( var i of mapRfdIssueStatus.keys()){

               if(mapRfdIssueStatus.get(i).toLowerCase()!="approved"){
                    console.log("=> Status of", i, "is currently ", mapRfdIssueStatus.get(i), "; Approve to continue deploying to ", env.toUpperCase() )
               }
               else {
                  console.log("=> ",i," is Approved")
              }
           }
           if((env.toLowerCase()==="dlvr"|| env.toLowerCase()==="int" && rfcStatus.toLowerCase()==="authorized for int") || (env.toLowerCase()==="test" && rfcStatus.toLowerCase()==="authorized for test") || (env.toLowerCase()==="prod" && rfcStatus.toLowerCase()==="authorized for prod") ){
                   
              console.log("=> RFC", rfcIssueKey,"is authorized to go to", env.toUpperCase() )
           }
           else{
              console.log("=> Authorize RFC", rfcIssueKey, "to", env.toUpperCase() , "to continue deploying" )
           }
       }
      console.log("\n--------------------------- STATUS OF READINESS CHECK FOR DEPLOYMENT  -----------------------------")
      console.log("=>  ", status.toUpperCase(), "FOR DEPLOYMENT")
      return status
    }
 
  }
}//end of class 
