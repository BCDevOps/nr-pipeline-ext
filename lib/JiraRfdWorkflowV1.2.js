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
const STATUS_IN__REVIEW = { id: '10313', name: 'In  review' }

const ACTION_731 = { name: 'Submit', id: '731', to: {...STATUS_SUBMITTED} }
const ACTION_301 = { name: 'Stop Progress', id: '301', to: {...STATUS_SCHEDULED} }
const ACTION_781 = { name: 'Resolve', id: '781', to: {...STATUS_RESOLVED} }
const ACTION_801 = { name: 'Request  info', id: '801', to: {...STATUS_WAITING_FOR_INFO} }
const ACTION_701 = { name: 'Close issue', id: '701', to: {...STATUS_CLOSED} }
const ACTION_951 = { name: 'Reopen', id: '951', to: {...STATUS_REOPENED} }
const ACTION_791 = { name: 'Resume progress', id: '791', to: {...STATUS_IN_PROGRESS} }
const ACTION_931 = { name: 'Re-submit', id: '931', to: {...STATUS_SUBMITTED} }
const ACTION_741 = { name: 'Request info', id: '741', to: {...STATUS_WAITING_FOR_INFO} }
const ACTION_881 = { name: 'Start review', id: '881', to: {...STATUS_IN__REVIEW} }
const ACTION_961 = { name: 'Start Progress', id: '961', to: {...STATUS_IN_PROGRESS} }
const ACTION_711 = { name: 'Schedule', id: '711', to: {...STATUS_SCHEDULED} }
const ACTION_941 = { name: 'Back to Submitted', id: '941', to: {...STATUS_SUBMITTED} }
const ACTION_751 = { name: 'Info  provided', id: '751', to: {...STATUS_SUBMITTED} }
const ACTION_811 = { name: 'Info provided', id: '811', to: {...STATUS_IN_PROGRESS} }
const ACTION_911 = { name: 'Info   provided', id: '911', to: {...STATUS_IN__REVIEW} }
const ACTION_771 = { name: 'Resume to in progress', id: '771', to: {...STATUS_IN_PROGRESS} }
const ACTION_831 = { name: 'Resume to scheduled', id: '831', to: {...STATUS_SCHEDULED} }
const ACTION_841 = { name: 'resume to open', id: '841', to: {...STATUS_OPEN} }
const ACTION_851 = { name: 'resume to submitted', id: '851', to: {...STATUS_SUBMITTED} }
const ACTION_871 = { name: 'Resume to approved', id: '871', to: {...STATUS_APPROVED} }
const ACTION_891 = { name: 'Resume to in review', id: '891', to: {...STATUS_IN__REVIEW} }
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
}
const WORKFLOW = {
    [STATUS_OPEN.id]: [
      ACTION_731,
    ],
    [STATUS_IN_PROGRESS.id]: [
      ACTION_301,
      ACTION_781,
      ACTION_801,
    ],
    [STATUS_RESOLVED.id]: [
      ACTION_701,
      ACTION_951,
    ],
    [STATUS_REOPENED.id]: [
      ACTION_791,
      ACTION_931,
    ],
    [STATUS_CLOSED.id]: [
    ],
    [STATUS_SUBMITTED.id]: [
      ACTION_741,
      ACTION_881,
      ACTION_961,
    ],
    [STATUS_APPROVED.id]: [
      ACTION_711,
      ACTION_941,
    ],
    [STATUS_SCHEDULED.id]: [
    ],
    [STATUS_WAITING_FOR_INFO.id]: [
      ACTION_751,
      ACTION_811,
      ACTION_911,
    ],
    [STATUS_ON_HOLD.id]: [
      ACTION_771,
      ACTION_831,
      ACTION_841,
      ACTION_851,
      ACTION_871,
      ACTION_891,
    ],
    [STATUS_IN__REVIEW.id]: [
      ACTION_721,
      ACTION_901,
    ],
}

module.exports = class {
    static INITIAL_STATUS = STATUS_OPEN
    static getTransitionsByStatusId(statusId) {
        return WORKFLOW[statusId]
    }

    static getTransitionById(transitionId) {
        return ACTIONS[transitionId]
    }
}
