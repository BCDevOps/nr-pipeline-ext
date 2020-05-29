'use strict'
const ISSUE_TYPE_CODE = Object.freeze({ RFD: 'RFD', RFD_SUBTASK: 'RFD-subtask' })
const ISSUE_STATUS_NAME = Object.freeze({
    SUBMITTED: 'Submitted',
    CLOSED: 'Closed',
    REOPENED: 'Reopened',
    RESOLVED: 'Resolved',
    OPENFORINT: 'Open for Int',
    AUTHORIZEDFORINT: 'Authorized for Int',
    AUTHORIZEDFORTEST: 'Authorized for Test',
    AUTHORIZEDFORPROD: 'Authorized for Prod',
    APPROVED: 'Approved',
}) // issue status 'name'.

const ISSUE_TRANSITION_ACTION_NAME = Object.freeze({
    REOPEN: 'Reopen',
    REOPEN_ISSUE: 'Reopen Issue',
    SUBMIT: 'Submit',
    RESUBMIT: 'Re-submit',
    CANCEL: 'Cancel',
    SCHEDULE: 'Schedule',
    START_PROGRESS: 'Start Progress',
    RESOLVE: 'Resolve',
    CLOSE: 'Close',
}) // action can take to transition for issue in workflow

const ISSUE_LINK_TYPE_NAME = Object.freeze({ RFC_FRD: 'RFC-RFD' })

const ENV = Object.freeze({ BUILD: 'build', DEV: 'dev', DLVR: 'dlvr', TEST: 'test', PROD: 'prod' })
const JIRA_TARGET_ENV = Object.freeze({ DLVR: 'DLVR', TEST: 'TEST', PROD: 'PROD' })

const JIRA_ENV_REVIEWER = Object.freeze([
    Object.freeze({ ENV: JIRA_TARGET_ENV.DLVR, REVIEWER: 'Developer' }),
    Object.freeze({ ENV: JIRA_TARGET_ENV.TEST, REVIEWER: 'IIT' }),
    Object.freeze({ ENV: JIRA_TARGET_ENV.PROD, REVIEWER: 'Business' }),
])

const DB_ACTION = Object.freeze({ BACKUP: 'backup', RECOVERY: 'recovery' })

const VERIFY_STATUS = Object.freeze({ READY: 'Ready', NOT_READY: 'Not Ready' })
const REASON = Object.freeze({
    REASON_CODE_RFD_BLOCKED: 'RFD_BLOCKED',
    REASON_DESC_RFD_BLOCKED: 'RFD(s) are blocked',
    REASON_CODE_RFD_NOT_APPROVED: 'RFD_NOT_APPROVED',
    REASON_DESC_RFD_NOT_APPROVED: 'RFD(s) are not approved',
    REASON_CODE_PREVIOUS_RFD_NOT_CLOSED: 'PREVIOUS_RFD_NOT_CLOSED',
    REASON_DESC_PREVIOUS_RFD_NOT_CLOSED: 'Previous stage RFD(s) are not closed',
    REASON_CODE_RFC_NOT_AUTHORIZED: 'RFC_NOT_AUTHORIZED',
    REASON_DESC_RFC_NOT_AUTHORIZED: 'RFC is not authorized to target environment',
})

module.exports = {
    ENV,
    JIRA_TARGET_ENV,
    ISSUE_TRANSITION_ACTION_NAME,
    ISSUE_LINK_TYPE_NAME,
    ISSUE_STATUS_NAME,
    ISSUE_TYPE_CODE,
    JIRA_ENV_REVIEWER,
    DB_ACTION,
    VERIFY_STATUS,
    REASON,
}
