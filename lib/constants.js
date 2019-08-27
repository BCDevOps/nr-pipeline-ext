"use strict";
const ISSUE_TYPE_CODE = { RFD: "RFD", RFD_SUBTASK: "RFD-subtask" };
const ISSUE_STATUS_NAME = { SUBMITTED: "Submitted", 
                            CLOSED: "Closed", 
                            REOPENED: "Reopened", 
                            RESOLVED: "Resolved" }; // issue status 'name'.

const ISSUE_TRANSITION_ACTION_NAME = { REOPEN: "Reopen", 
                                       REOPEN_ISSUE: "Reopen Issue", 
                                       SUBMIT: "Submit", 
                                       RESUBMIT: "Re-submit", 
                                       CANCEL: "Cancel",
                                       SCHEDULE: "Schedule",
                                       START_PROGRESS: "Start Progress",
                                       RESOLVE: "Resolve"
                                     }; // action can take to transition for issue in workflow

module.exports = { ISSUE_TRANSITION_ACTION_NAME, 
                   ISSUE_STATUS_NAME, 
                   ISSUE_TYPE_CODE };
