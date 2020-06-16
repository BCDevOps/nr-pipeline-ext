/* eslint-disable prettier/prettier */
'use strict'

const STATUS_CLOSED = { id: '6', name: 'Closed' }
const STATUS_IN_EVAL_FOR_INT = { id: '10303', name: 'In Eval for Int' }
const STATUS_IN_REVIEW_FOR_INT = { id: '10306', name: 'In Review for Int' }
const STATUS_AUTHORIZED_FOR_INT = { id: '10300', name: 'Authorized for Int' }
const STATUS_IN_EVAL_FOR_TEST = { id: '10305', name: 'In Eval for Test' }
const STATUS_IN_REVIEW_FOR_TEST = { id: '10308', name: 'In Review for Test' }
const STATUS_AUTHORIZED_FOR_TEST = { id: '10302', name: 'Authorized for Test' }
const STATUS_IN_REVIEW_FOR_PROD = { id: '10307', name: 'In Review for Prod' }
const STATUS_AUTHORIZED_FOR_PROD = { id: '10301', name: 'Authorized for Prod' }
const STATUS_IN_EVAL_FOR_PROD = { id: '10304', name: 'In Eval for Prod' }
const STATUS_OPEN_FOR_TEST = { id: '10311', name: 'Open for Test' }
const STATUS_OPEN_FOR_PROD = { id: '10310', name: 'Open for Prod' }
const STATUS_OPEN_FOR_INT = { id: '10309', name: 'Open for Int' }

const WORKFLOW = {
    [STATUS_CLOSED.id]: [
    ],
    [STATUS_IN_EVAL_FOR_INT.id]: [
      { name: 'In review for INT', id: '141', to: {...STATUS_IN_REVIEW_FOR_INT} },
    ],
    [STATUS_IN_REVIEW_FOR_INT.id]: [
      { name: 'Authorize for Int', id: '151', to: {...STATUS_AUTHORIZED_FOR_INT} },
      { name: 'Reject', id: '171', to: {...STATUS_IN_EVAL_FOR_INT} },
    ],
    [STATUS_AUTHORIZED_FOR_INT.id]: [
      { name: 'Failed Deployment to INT', id: '161', to: {...STATUS_OPEN_FOR_INT} },
      { name: 'Assign to Initiator', id: '181', to: {...STATUS_AUTHORIZED_FOR_INT} },
      { name: 'Successful deployment to INT', id: '191', to: {...STATUS_OPEN_FOR_TEST} },
    ],
    [STATUS_IN_EVAL_FOR_TEST.id]: [
      { name: 'In review for TEST', id: '231', to: {...STATUS_IN_REVIEW_FOR_TEST} },
    ],
    [STATUS_IN_REVIEW_FOR_TEST.id]: [
      { name: 'Reject', id: '241', to: {...STATUS_IN_EVAL_FOR_TEST} },
      { name: 'Authorize for TEST', id: '251', to: {...STATUS_AUTHORIZED_FOR_TEST} },
    ],
    [STATUS_AUTHORIZED_FOR_TEST.id]: [
      { name: 'Failed deployment to TEST', id: '301', to: {...STATUS_OPEN_FOR_TEST} },
      { name: 'Successful deployment to TEST', id: '311', to: {...STATUS_OPEN_FOR_PROD} },
      { name: 'Assign to initiator', id: '331', to: {...STATUS_AUTHORIZED_FOR_TEST} },
    ],
    [STATUS_IN_REVIEW_FOR_PROD.id]: [
      { name: 'Reject', id: '271', to: {...STATUS_IN_EVAL_FOR_PROD} },
      { name: 'Authorize for PROD', id: '281', to: {...STATUS_AUTHORIZED_FOR_PROD} },
    ],
    [STATUS_AUTHORIZED_FOR_PROD.id]: [
      { name: 'Failed deployment to PROD', id: '291', to: {...STATUS_OPEN_FOR_TEST} },
      { name: 'Successful deployment to PROD', id: '321', to: {...STATUS_CLOSED} },
      { name: 'Assign to initiator', id: '341', to: {...STATUS_AUTHORIZED_FOR_PROD} },
    ],
    [STATUS_IN_EVAL_FOR_PROD.id]: [
      { name: 'In review for PROD', id: '261', to: {...STATUS_IN_REVIEW_FOR_PROD} },
    ],
    [STATUS_OPEN_FOR_TEST.id]: [
      { name: 'Submit to eval for TEST', id: '211', to: {...STATUS_IN_EVAL_FOR_TEST} },
    ],
    [STATUS_OPEN_FOR_PROD.id]: [
      { name: 'Submit to eval for PROD', id: '221', to: {...STATUS_IN_EVAL_FOR_PROD} },
    ],
    [STATUS_OPEN_FOR_INT.id]: [
      { name: 'Submit to eval for INT', id: '11', to: {...STATUS_IN_EVAL_FOR_INT} },
      { name: 'Open for TEST', id: '351', to: {...STATUS_OPEN_FOR_TEST} },
      { name: 'Open for PROD', id: '361', to: {...STATUS_OPEN_FOR_PROD} },
    ],
}

module.exports = class {
    static INITIAL_STATUS = STATUS_OPEN_FOR_INT
    static getTransitionsFrom(statusId) {
        return WORKFLOW[statusId]
    }
}
