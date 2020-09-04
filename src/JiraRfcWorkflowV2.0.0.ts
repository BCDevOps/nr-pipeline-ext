'use strict'

const STATUS_OPEN: Status = { id: '1', name: 'Open' }
const STATUS_SUBMIT: Status = { id: '10500', name: 'Submit' }
const STATUS_APPROVED: Status = { id: '10312', name: 'Approved' }
const STATUS_RESOLVED: Status = { id: '5', name: 'Resolved' }
const STATUS_CLOSED: Status = { id: '6', name: 'Closed' }

const ACTION_11: Action = { name: 'Cancel', id: '11', to: {...STATUS_CLOSED} }
const ACTION_21: Action = { name: 'Submit', id: '21', to: {...STATUS_SUBMIT} }
const ACTION_31: Action = { name: 'Approve', id: '31', to: {...STATUS_APPROVED} }
const ACTION_41: Action = { name: 'Reject', id: '41', to: {...STATUS_OPEN} }
const ACTION_71: Action = { name: 'Mark Successful', id: '71', to: {...STATUS_RESOLVED} }
const ACTION_91: Action = { name: 'Mark Failure', id: '91', to: {...STATUS_SUBMIT} }
const ACTION_101: Action = { name: 'Re-review', id: '101', to: {...STATUS_OPEN} }
const ACTION_81: Action = { name: 'Complete', id: '81', to: {...STATUS_CLOSED} }

const ACTIONS: Actions = {
    [ACTION_21.id]:ACTION_21,
    [ACTION_31.id]:ACTION_31,
    [ACTION_41.id]:ACTION_41,
    [ACTION_71.id]:ACTION_71,
    [ACTION_91.id]:ACTION_91,
    [ACTION_101.id]:ACTION_101,
    [ACTION_81.id]:ACTION_81,
    [ACTION_11.id]:ACTION_11,
}
const WORKFLOW: Workflow = {
    [STATUS_OPEN.id]: [
      ACTION_21, // Submit
      ACTION_11, // Cancel
    ],
    [STATUS_SUBMIT.id]: [
      ACTION_31, // Approve
      ACTION_41, // Reject
      ACTION_11, // Cancel
    ],
    [STATUS_APPROVED.id]: [
      ACTION_71, // Mark Successful
      ACTION_91, // Mark Failure
      ACTION_101, // Re-review
      ACTION_11, // Cancel
    ],
    [STATUS_RESOLVED.id]: [
      ACTION_81, // Complete
      ACTION_11, // Cancel
    ],
    [STATUS_CLOSED.id]: [
      ACTION_11, // Cancel
    ],
}

module.exports = class {

    static ACTION_11: Action = ACTION_11
    static ACTION_21: Action = ACTION_21
    static ACTION_31: Action = ACTION_31
    static ACTION_41: Action = ACTION_41
    static ACTION_71: Action = ACTION_71
    static ACTION_91: Action = ACTION_91
    static ACTION_101: Action = ACTION_101
    static ACTION_81: Action = ACTION_81

    static STATUS_OPEN: Status = STATUS_OPEN
    static STATUS_SUBMIT: Status = STATUS_SUBMIT
    static STATUS_APPROVED: Status = STATUS_APPROVED
    static STATUS_RESOLVED: Status = STATUS_RESOLVED
    static STATUS_CLOSED: Status = STATUS_CLOSED

    static ALL_STATUS: Status[] = [
        STATUS_OPEN,
        STATUS_SUBMIT,
        STATUS_APPROVED,
        STATUS_RESOLVED,
        STATUS_CLOSED,
    ]

    static INITIAL_STATUS: Status = STATUS_OPEN
    static getTransitionsByStatusId(statusId: string): Action[] {
        return WORKFLOW[statusId]
    }

    static getTransitionById(transitionId: string): Action {
        return ACTIONS[transitionId]
    }
}
