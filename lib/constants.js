"use strict";
const ISSUE_TYPE_CODE = { RFD: "RFD", RFD_SUBTASK: "RFD-subtask" };
const ISSUE_STATUS_NAME = { SUBMITTED: "Submitted", 
                            CLOSED: "Closed", 
                            REOPENED: "Reopened", 
                            RESOLVED: "Resolved",
                            OPENFORINT: "Open for Int"}; // issue status 'name'.

const ISSUE_TRANSITION_ACTION_NAME = { REOPEN: "Reopen", 
                                       REOPEN_ISSUE: "Reopen Issue", 
                                       SUBMIT: "Submit", 
                                       RESUBMIT: "Re-submit", 
                                       CANCEL: "Cancel",
                                       SCHEDULE: "Schedule",
                                       START_PROGRESS: "Start Progress",
                                       RESOLVE: "Resolve",
                                       CLOSE: "Close"
                                     }; // action can take to transition for issue in workflow

const ENV = { BUILD: 'build' , DEV: 'dev', DLVR: 'dlvr', TEST: 'test' , PROD: 'prod'}
const JIRA_TARGET_ENV = {DLVR: 'DLVR', TEST: 'TEST', PROD: 'PROD'};
const REVIEWER_ENV_MAP = new Map([[JIRA_TARGET_ENV.DLVR, "Developer"], [JIRA_TARGET_ENV.TEST, "IIT"], [JIRA_TARGET_ENV.PROD, "Business"]]);

module.exports = { ENV,
                   JIRA_TARGET_ENV,
                   ISSUE_TRANSITION_ACTION_NAME, 
                   ISSUE_STATUS_NAME, 
                   ISSUE_TYPE_CODE,
                   REVIEWER_ENV_MAP};
