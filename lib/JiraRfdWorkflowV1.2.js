/* eslint-disable prettier/prettier */
'use strict'

const STATUS_OPEN = { id: '1', name: 'Open' }
const STATUS_IN_PROGRESS = { id: '3', name: 'In Progress' }
const STATUS_RESOLVED = { id: '5', name: 'Resolved' }
const STATUS_REOPENED = { id: '4', name: 'Reopened' }
const STATUS_CLOSED = { id: '6', name: 'Closed' }
const STATUS_SUBMITTED = { id: '10316', name: 'Submitted' }
const STATUS_APPROVED = { id: '10312', name: 'Approved' }
const STATUS_SCHEDULED = { id: '10315', name: 'Scheduled' }
const STATUS_WAITING_FOR_INFO = { id: '10317', name: 'Waiting for info' }
const STATUS_ON_HOLD = { id: '10314', name: 'On hold' }
const STATUS_IN_REVIEW = { id: '10313', name: 'In  review' }

const ACTION_821 = { name: 'On hold', id: '821', to: {...STATUS_ON_HOLD} }
const ACTION_921 = { name: 'Cancel', id: '921', to: {...STATUS_CLOSED} }
const ACTION_3 = { name: 'Reopen issue', id: '3', to: {...STATUS_REOPENED} }
const ACTION_4 = { name: 'Start progress', id: '4', to: {...STATUS_IN_PROGRESS} }
const ACTION_5 = { name: 'Resolve', id: '5', to: {...STATUS_RESOLVED} }
const ACTION_731 = { name: 'Submit', id: '731', to: {...STATUS_SUBMITTED} }
const ACTION_301 = { name: 'Stop Progress', id: '301', to: {...STATUS_SCHEDULED} }
const ACTION_781 = { name: 'Resolve', id: '781', to: {...STATUS_RESOLVED} }
const ACTION_801 = { name: 'Request  info', id: '801', to: {...STATUS_WAITING_FOR_INFO} }
const ACTION_701 = { name: 'Close issue', id: '701', to: {...STATUS_CLOSED} }
const ACTION_951 = { name: 'Reopen', id: '951', to: {...STATUS_REOPENED} }
const ACTION_791 = { name: 'Resume progress', id: '791', to: {...STATUS_IN_PROGRESS} }
const ACTION_931 = { name: 'Re-submit', id: '931', to: {...STATUS_SUBMITTED} }
const ACTION_741 = { name: 'Request info', id: '741', to: {...STATUS_WAITING_FOR_INFO} }
const ACTION_881 = { name: 'Start review', id: '881', to: {...STATUS_IN_REVIEW} }
const ACTION_961 = { name: 'Start Progress', id: '961', to: {...STATUS_IN_PROGRESS} }
const ACTION_711 = { name: 'Schedule', id: '711', to: {...STATUS_SCHEDULED} }
const ACTION_941 = { name: 'Back to Submitted', id: '941', to: {...STATUS_SUBMITTED} }
const ACTION_751 = { name: 'Info  provided', id: '751', to: {...STATUS_SUBMITTED} }
const ACTION_811 = { name: 'Info provided', id: '811', to: {...STATUS_IN_PROGRESS} }
const ACTION_911 = { name: 'Info   provided', id: '911', to: {...STATUS_IN_REVIEW} }
const ACTION_771 = { name: 'Resume to in progress', id: '771', to: {...STATUS_IN_PROGRESS} }
const ACTION_831 = { name: 'Resume to scheduled', id: '831', to: {...STATUS_SCHEDULED} }
const ACTION_841 = { name: 'resume to open', id: '841', to: {...STATUS_OPEN} }
const ACTION_851 = { name: 'resume to submitted', id: '851', to: {...STATUS_SUBMITTED} }
const ACTION_871 = { name: 'Resume to approved', id: '871', to: {...STATUS_APPROVED} }
const ACTION_891 = { name: 'Resume to in review', id: '891', to: {...STATUS_IN_REVIEW} }
const ACTION_721 = { name: 'Approve', id: '721', to: {...STATUS_APPROVED} }
const ACTION_901 = { name: 'request info', id: '901', to: {...STATUS_WAITING_FOR_INFO} }

const ACTIONS = {
    [ACTION_731.id]:ACTION_731,
    [ACTION_301.id]:ACTION_301,
    [ACTION_781.id]:ACTION_781,
    [ACTION_801.id]:ACTION_801,
    [ACTION_701.id]:ACTION_701,
    [ACTION_951.id]:ACTION_951,
    [ACTION_791.id]:ACTION_791,
    [ACTION_931.id]:ACTION_931,
    [ACTION_741.id]:ACTION_741,
    [ACTION_881.id]:ACTION_881,
    [ACTION_961.id]:ACTION_961,
    [ACTION_711.id]:ACTION_711,
    [ACTION_941.id]:ACTION_941,
    [ACTION_751.id]:ACTION_751,
    [ACTION_811.id]:ACTION_811,
    [ACTION_911.id]:ACTION_911,
    [ACTION_771.id]:ACTION_771,
    [ACTION_831.id]:ACTION_831,
    [ACTION_841.id]:ACTION_841,
    [ACTION_851.id]:ACTION_851,
    [ACTION_871.id]:ACTION_871,
    [ACTION_891.id]:ACTION_891,
    [ACTION_721.id]:ACTION_721,
    [ACTION_901.id]:ACTION_901,
    [ACTION_821.id]:ACTION_821,
    [ACTION_921.id]:ACTION_921,
    [ACTION_3.id]:ACTION_3,
    [ACTION_4.id]:ACTION_4,
    [ACTION_5.id]:ACTION_5,
}
const WORKFLOW = {
    [STATUS_OPEN.id]: [
      ACTION_731, // Submit
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_IN_PROGRESS.id]: [
      ACTION_301, // Stop Progress
      ACTION_781, // Resolve
      ACTION_801, // Request  info
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_RESOLVED.id]: [
      ACTION_701, // Close issue
      ACTION_951, // Reopen
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_REOPENED.id]: [
      ACTION_791, // Resume progress
      ACTION_931, // Re-submit
      ACTION_5, // Resolve
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_CLOSED.id]: [
      ACTION_3, // Reopen issue
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_SUBMITTED.id]: [
      ACTION_741, // Request info
      ACTION_881, // Start review
      ACTION_961, // Start Progress
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_APPROVED.id]: [
      ACTION_711, // Schedule
      ACTION_941, // Back to Submitted
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_SCHEDULED.id]: [
      ACTION_4, // Start progress
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_WAITING_FOR_INFO.id]: [
      ACTION_751, // Info  provided
      ACTION_811, // Info provided
      ACTION_911, // Info   provided
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_ON_HOLD.id]: [
      ACTION_771, // Resume to in progress
      ACTION_831, // Resume to scheduled
      ACTION_841, // resume to open
      ACTION_851, // resume to submitted
      ACTION_871, // Resume to approved
      ACTION_891, // Resume to in review
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
    [STATUS_IN_REVIEW.id]: [
      ACTION_721, // Approve
      ACTION_901, // request info
      ACTION_821, // On hold
      ACTION_921, // Cancel
    ],
}

module.exports = class {

    static ACTION_821 = ACTION_821
    static ACTION_921 = ACTION_921
    static ACTION_3 = ACTION_3
    static ACTION_4 = ACTION_4
    static ACTION_5 = ACTION_5
    static ACTION_731 = ACTION_731
    static ACTION_301 = ACTION_301
    static ACTION_781 = ACTION_781
    static ACTION_801 = ACTION_801
    static ACTION_701 = ACTION_701
    static ACTION_951 = ACTION_951
    static ACTION_791 = ACTION_791
    static ACTION_931 = ACTION_931
    static ACTION_741 = ACTION_741
    static ACTION_881 = ACTION_881
    static ACTION_961 = ACTION_961
    static ACTION_711 = ACTION_711
    static ACTION_941 = ACTION_941
    static ACTION_751 = ACTION_751
    static ACTION_811 = ACTION_811
    static ACTION_911 = ACTION_911
    static ACTION_771 = ACTION_771
    static ACTION_831 = ACTION_831
    static ACTION_841 = ACTION_841
    static ACTION_851 = ACTION_851
    static ACTION_871 = ACTION_871
    static ACTION_891 = ACTION_891
    static ACTION_721 = ACTION_721
    static ACTION_901 = ACTION_901

    static STATUS_OPEN = STATUS_OPEN
    static STATUS_IN_PROGRESS = STATUS_IN_PROGRESS
    static STATUS_RESOLVED = STATUS_RESOLVED
    static STATUS_REOPENED = STATUS_REOPENED
    static STATUS_CLOSED = STATUS_CLOSED
    static STATUS_SUBMITTED = STATUS_SUBMITTED
    static STATUS_APPROVED = STATUS_APPROVED
    static STATUS_SCHEDULED = STATUS_SCHEDULED
    static STATUS_WAITING_FOR_INFO = STATUS_WAITING_FOR_INFO
    static STATUS_ON_HOLD = STATUS_ON_HOLD
    static STATUS_IN_REVIEW = STATUS_IN_REVIEW

    static INITIAL_STATUS = STATUS_OPEN
    static getTransitionsByStatusId(statusId) {
        return WORKFLOW[statusId]
    }

    static getTransitionById(transitionId) {
        return ACTIONS[transitionId]
    }
}
