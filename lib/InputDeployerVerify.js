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
    const key= changeBranch.split('-')
    const rfcIssueKey = key[0]+'-'+key[1]
    let prevEnv = null

    if(env.toLowerCase()==="test"){
         prevEnv="dlvr"
    }
    else if(env.toLowerCase()==="prod"){
         prevEnv="test"
    }
    else{
        //pass
    }


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
  if(prevEnv){
       var mapRfdPrevEnvIssue = new Map()
       for (var issue of rfdIssueLinks){
         var rfdInfo = await jiraClient.getIssue(issue)
         if(rfdInfo.fields.customfield_10121.value.toLowerCase()===prevEnv){
             mapRfdPrevEnvIssue.set(issue,rfdInfo.fields.status.name)
         }    
      }
   }


      var sizeofMap=Array.from(mapRfdAutoBlockedIssue.keys())
       if(sizeofMap.length!=0){
           if(rfdAutoBlockStatus.every( (val)  => val === "Resolved")){
                 console.log("\n---------------------------  LIST OF BLOCKING ISSUES  ---------------------------\n")
                 for(var rfdIssue of mapRfdAutoBlockedIssue.keys()) {
                   console.log("=> Automated RFD: ", rfdIssue, "was blocked by", mapRfdAutoBlockedIssue.get(rfdIssue)[0],"which is RESOLVED" )
                 }
                var rfcInfo = await jiraClient.getIssue(rfcIssueKey)
                var rfcStatus = rfcInfo.fields.status.name
                var status=null;
                if(Array.from(mapRfdAutoIssue.values()).every( (val, arr) => val ==="Approved") && (rfcStatus.toLowerCase()==="authorized for int" || rfcStatus.toLowerCase()==="authorized for test" || rfcStatus.toLowerCase()==="authorized for prod")){
                   if(prevEnv){
                      if(Array.from(mapRfdPrevEnvIssue.values()).every( (val, arr) => val ==="Closed")){
                         status="Ready"
                      }
                      else {
                         status="Not Ready"
                      }
                   }
                   else{
                      status="Ready"
                   }
                  }
                  else {
                     status="Not Ready"
                  }
                  if(status=="Ready"){
                      console.log("\n---------------------------     CURRENT ISSUE STATUS    ---------------------------\n")
                      for(var i of Array.from(mapRfdAutoIssue.keys())){
                        var issueInfo = await jiraClient.getIssue(i)
                           if(issueInfo.fields.labels.includes("auto")){
                              console.log('=> Automated RFD:', i, "is Approved")
                           }
                           else {
                           console.log('=> Manual RFD:', i, "is Approved")
                           }
                      }
                      if(prevEnv){
                        for(var i of Array.from(mapRfdPrevEnvIssue.keys())){
                           var issueInfo = await jiraClient.getIssue(i)
                           if(issueInfo.fields.labels.includes("auto")){
                              console.log('=> Automated RFD : ', i, "for env:", prevEnv, "is Closed")
                           }
                           else {
                           console.log('=> Manual RFD: ', i, "for env:", prevEnv, "is Closed")
                           }
                        }
                       }
                      console.log ("=> RFC", rfcIssueKey, "is", rfcStatus)
                  }
                  
                  else{
                     for ( var i of mapRfdAutoIssue.keys()){
                        var issueInfo = await jiraClient.getIssue(i)
                        console.log("\n---------------------------     CURRENT RFD STATUS     ---------------------------\n")
                         if(mapRfdIssueStatus.get(i).toLowerCase()!="approved"){
                           
                           if(issueInfo.fields.labels.includes("auto")){
                             console.log("=> Status of Automated RFD:", i, "is currently ", mapRfdAutoIssue.get(i), "; Approve to continue deploying to ", env.toUpperCase())
                           }
                           else {
                              console.log("=> Status of Manual RFD:", i, "is currently ", mapRfdAutoIssue.get(i), "; Approve to continue deploying to ", env.toUpperCase() )
                           } 
                        }
                         else {
                           if(issueInfo.fields.labels.includes("auto")){
                              console.log("=> Automated RFD:",i," is Approved")
                           }
                           else{
                              console.log("=> Manual RFD:",i," is Approved")
                           }
                         }
                     }
                     if(prevEnv){
                        console.log("\n---------------------------   PREVIOUS ENVIRONMENT RFD STATUS     ---------------------------\n")
                       for ( var i of mapRfdPrevEnvIssue.keys()){
                          var issueInfo = await jiraClient.getIssue(i)
                          
                          if(mapRfdPrevEnvIssue.get(i).toLowerCase()!="closed"){
                          
                              if(issueInfo.fields.labels.includes("auto")){
                                console.log("=> Status of Automated RFD:", i, "for env:", prevEnv, "is currently ", mapRfdPrevEnvIssue.get(i), "; Close to continue deploying to ", env.toUpperCase())
                              }
                              else{
                                 console.log("=> Status of Manual RFD:", i,"for env:", prevEnv, "is currently ", mapRfdPrevEnvIssue.get(i), "; Close to continue deploying to ", env.toUpperCase())
                              }
                          }
                         else {
                           if(issueInfo.fields.labels.includes("auto")){
                             console.log("=> Automated RFD",i, "for env:", prevEnv, " is Closed")
                           }
                           else{
                              console.log("=> Manual RFD",i, "for env:", prevEnv, " is Closed")
                           }
                          }
                       }
                     }
                     console.log("\n---------------------------   RFC STATUS     ---------------------------\n")
                     if(((env.toLowerCase()==="dlvr"|| env.toLowerCase()==="int") && rfcStatus.toLowerCase()==="authorized for int") || (env.toLowerCase()==="test" && rfcStatus.toLowerCase()==="authorized for test") || (env.toLowerCase()==="prod" && rfcStatus.toLowerCase()==="authorized for prod")){
                        console.log("=> RFC", rfcIssueKey,"is authorized to go to", env.toUpperCase() )
                       }
                      else{
                        console.log("=> Current RFC Status is", rfcStatus, ", Authorize RFC", rfcIssueKey, "to", env.toUpperCase() , "to continue deploying" )
                       }
                   }
                 console.log("\n--------------------------- STATUS OF READINESS CHECK FOR DEPLOYMENT  -----------------------------\n")
                 console.log("=>  ", status.toUpperCase(), "\n")
                 return status

            }
           else{
            var status = "Not Ready"
            console.log("\n---------------------------     CURRENT ISSUE STATUS   ---------------------------\n")
              for(var rfdIssue of mapRfdAutoBlockedIssue.keys()) {
                console.log("Automated RFD:", rfdIssue, "is blocked by issue:", mapRfdAutoBlockedIssue.get(rfdIssue)[0],"which is not resolved yet with current status:",  mapRfdAutoBlockedIssue.get(rfdIssue)[1] )
               }
               console.log("\n--------------------------- STATUS OF READINESS CHECK FOR DEPLOYMENT  -----------------------------\n")
               console.log("=>  ", status.toUpperCase(), "\n")
               return status
           }
        }


       else{
         // Check status of RFC and RFD
         console.log("\n There are no blocked Issues for any automated RFDs \n")
         var rfcInfo = await jiraClient.getIssue(rfcIssueKey)
         var rfcStatus = rfcInfo.fields.status.name
         var status=null;
         if(Array.from(mapRfdIssueStatus.values()).every( (val, arr) => val ==="Approved") && (rfcStatus.toLowerCase()==="authorized for int" || rfcStatus.toLowerCase()==="authorized for test" || rfcStatus.toLowerCase()==="authorized for prod")){
            if(prevEnv){
               if(Array.from(mapRfdPrevEnvIssue.values()).every( (val, arr) => val ==="Closed")){
                  status="Ready"
               }
               else {
                  status="Not Ready"
               }
            }
            else{
               status="Ready"
            }
         }
         else {
            status="Not Ready"
         }
         if(status==="Ready"){
            console.log("\n---------------------------     CURRENT ISSUE STATUS     ---------------------------\n")
            for(var i of Array.from(mapRfdIssueStatus.keys())){
               var issueInfo = await jiraClient.getIssue(i)
                  if(issueInfo.fields.labels.includes("auto")){
                     console.log('=> Automated RFD:', i, "is Approved")
                  }
                  else {
                  console.log('=> Manual RFD:', i, "is Approved")
                  }
             }
             if(prevEnv){
               for(var i of Array.from(mapRfdPrevEnvIssue.keys())){
                  var issueInfo = await jiraClient.getIssue(i)
                  if(issueInfo.fields.labels.includes("auto")){
                     console.log('=> Automated RFD : ', i, "for env:", prevEnv, "is Closed")
                  }
                  else {
                  console.log('=> Manual RFD: ', i, "for env:", prevEnv, "is Closed")
                  }
               }
              }
            console.log ("=> ", rfcIssueKey, "is", rfcStatus)
         }
         else{
            for ( var i of mapRfdIssueStatus.keys()){
               var issueInfo = await jiraClient.getIssue(i)
               console.log("\n---------------------------     CURRENT RFD STATUS     ---------------------------\n")
               if(mapRfdIssueStatus.get(i).toLowerCase()!="approved"){
                  if(issueInfo.fields.labels.includes("auto")){
                     console.log("=> Status of Automated RFD:", i, "is currently ", mapRfdIssueStatus.get(i), "; Approve to continue deploying to ", env.toUpperCase())
                  }
                  else {
                     console.log("=> Status of Manual RFD:", i, "is currently ", mapRfdIssueStatus.get(i), "; Approve to continue deploying to ", env.toUpperCase() )
                  } 
               }
               else {
                     if(issueInfo.fields.labels.includes("auto")){
                        console.log("=> Automated RFD:",i," is Approved")
                     }
                     else{
                        console.log("=> Manual RFD:",i," is Approved")
                     }
               }
           }
           if(prevEnv){
            for ( var i of mapRfdPrevEnvIssue.keys()){
               var issueInfo = await jiraClient.getIssue(i)
               console.log("\n---------------------------   PREVIOUS ENVIRONMENT RFD STATUS     ---------------------------\n")
               if(mapRfdPrevEnvIssue.get(i).toLowerCase()!="closed"){
                  
                   if(issueInfo.fields.labels.includes("auto")){
                     console.log("=> Status of Automated RFD:", i, "for env:", prevEnv, "is currently ", mapRfdPrevEnvIssue.get(i), "; Close to continue deploying to ", env.toUpperCase())
                   }
                   else{
                      console.log("=> Status of Manual RFD:", i,"for env:", prevEnv, "is currently ", mapRfdPrevEnvIssue.get(i), "; Close to continue deploying to ", env.toUpperCase())
                   }
               }
              else {
                if(issueInfo.fields.labels.includes("auto")){
                  console.log("=> Automated RFD",i, "for env:", prevEnv, " is Closed")
                }
                else{
                   console.log("=> Manual RFD",i, "for env:", prevEnv, " is Closed")
                }
               }
            }
          }
          console.log("\n---------------------------   RFC STATUS     ---------------------------\n")
           if(((env.toLowerCase()==="dlvr"|| env.toLowerCase()==="int") && rfcStatus.toLowerCase()==="authorized for int") || (env.toLowerCase()==="test" && rfcStatus.toLowerCase()==="authorized for test") || (env.toLowerCase()==="prod" && rfcStatus.toLowerCase()==="authorized for prod")){
              console.log("=> RFC", rfcIssueKey,"is authorized to go to", env.toUpperCase() )
           }
           else{
              console.log("=> Current RFC Status is", rfcStatus, ", Authorize RFC", rfcIssueKey, "to", env.toUpperCase() , "to continue deploying" )
           }
       }
      console.log("\n--------------------------- STATUS OF READINESS CHECK FOR DEPLOYMENT  -----------------------------\n")
      console.log("=>  ", status.toUpperCase(), "\n")
      return status
    }
 
  }
}//end of class 
