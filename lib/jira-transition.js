'use strict';

const jiraClass = require('nr-pipeline-ext').Jira
const CONST = require('nr-pipeline-ext').CONST;

// Define the variables required by jira.js
const jiraSettings= { url:'bwa.nrs.gov.bc.ca/int/jira', username:`${process.env.JIRA_USER}`, password:`${process.env.JIRA_PASS}`, rfcIssueKey:`${process.env.JIRA_RFC}`, env: `${process.env.ENV}`}
const jira = new jiraClass(Object.assign({ phase: 'jira-transition', jira: jiraSettings}))

// Fetch the RFD task and subtask information such as the key and status
var JiraClient = require('jira-connector');
var jiraClient = new JiraClient({
  host: jiraSettings.url,
  basic_auth: {
    username: jiraSettings.username,
    password: jiraSettings.password
  }
});

    let rfdTask;
    let rfdSubtask1;
    let rfdSubtask2;
    var env = jiraSettings.env;

    jiraClient.issue.getIssue({
        issueKey: jiraSettings.rfcIssueKey
        , function(error, issue) {
        }
      }).then(async function(info) {
           var rfcIssueLinksArray = [];

           // RFD issue links
           var rfcIssueLinks = info.fields.issuelinks;
           rfcIssueLinks.forEach(links => {
               rfcIssueLinksArray.push({"summary":links.outwardIssue.fields.summary,"key":links.outwardIssue.key })
           }) 
           //rfcIssueLinksArray=rfcIssueLinksArray.sort(); // sort the links to get them in the order of dev, test, prod (jira manages the order differently)
           if(env == "DLVR"){
             console.log(issue.summary)
               rfdTask = rfcIssueLinksArray.find( issue => issue.summary.includes("DLVR"));
               rfdTask = rfdTask.key
           }
           else if(env == "TEST"){
            rfdTask = rfcIssueLinksArray.find( issue => issue.summary.includes("TEST"));
            rfdTask = rfdTask.key
           }
           else if(env == "PROD"){
            rfdTask = rfcIssueLinksArray.find( issue => issue.summary.includes("PROD"));
            rfdTask = rfdTask.key
           }
           
           var rfdInfo = await jiraClient.issue.getIssue({ 
                issueKey: rfdTask
                , function(error, issue) {
                }
            }).then(function (result) {
              return result.fields.subtasks
            }).then(async rfdSubtaskInfo => {
              rfdSubtask1 = rfdSubtaskInfo[0].key;
              rfdSubtask2 = rfdSubtaskInfo[1].key;
            });
           //console.log(rfdTask, rfdSubtask1, rfdSubtask2);

    // Transisition the Subtask and Task to Schedule (711)
    await jira.transition(rfdSubtask1, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE); 
    await jira.transition(rfdSubtask2, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE); 
    await jira.transition(rfdTask, CONST.ISSUE_TRANSITION_ACTION_NAME.SCHEDULE);

    // Transisition the Subtask and Task to Start Progress (4)
    await jira.transition(rfdSubtask1, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS);
    await jira.transition(rfdSubtask2, CONST.ISSUE_TRANSITION_ACTION_NAME.START_PROGRESS);
    //await jira.transition(rfdTask, 4);

    // Transisition the Subtask and Task to Resolve (781)
    await jira.transition(rfdSubtask1, CONST.ISSUE_TRANSITION_ACTION_NAME.RESOLVE);
    await jira.transition(rfdSubtask2, CONST.ISSUE_TRANSITION_ACTION_NAME.RESOLVE);
    //await jira.transition(rfdTask, 781);
    
     });

