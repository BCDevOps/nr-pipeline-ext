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

const ACTION_201 = { name: 'Cancel', id: '201', to: {...STATUS_CLOSED} }
const ACTION_81 = { name: 'Reopen', id: '81', to: {...STATUS_OPEN_FOR_INT} }
const ACTION_141 = { name: 'In review for INT', id: '141', to: {...STATUS_IN_REVIEW_FOR_INT} }
const ACTION_151 = { name: 'Authorize for Int', id: '151', to: {...STATUS_AUTHORIZED_FOR_INT} }
const ACTION_171 = { name: 'Reject', id: '171', to: {...STATUS_IN_EVAL_FOR_INT} }
const ACTION_161 = { name: 'Failed Deployment to INT', id: '161', to: {...STATUS_OPEN_FOR_INT} }
const ACTION_181 = { name: 'Assign to Initiator', id: '181', to: {...STATUS_AUTHORIZED_FOR_INT} }
const ACTION_191 = { name: 'Successful deployment to INT', id: '191', to: {...STATUS_OPEN_FOR_TEST} }
const ACTION_231 = { name: 'In review for TEST', id: '231', to: {...STATUS_IN_REVIEW_FOR_TEST} }
const ACTION_241 = { name: 'Reject', id: '241', to: {...STATUS_IN_EVAL_FOR_TEST} }
const ACTION_251 = { name: 'Authorize for TEST', id: '251', to: {...STATUS_AUTHORIZED_FOR_TEST} }
const ACTION_301 = { name: 'Failed deployment to TEST', id: '301', to: {...STATUS_OPEN_FOR_TEST} }
const ACTION_311 = { name: 'Successful deployment to TEST', id: '311', to: {...STATUS_OPEN_FOR_PROD} }
const ACTION_331 = { name: 'Assign to initiator', id: '331', to: {...STATUS_AUTHORIZED_FOR_TEST} }
const ACTION_271 = { name: 'Reject', id: '271', to: {...STATUS_IN_EVAL_FOR_PROD} }
const ACTION_281 = { name: 'Authorize for PROD', id: '281', to: {...STATUS_AUTHORIZED_FOR_PROD} }
const ACTION_291 = { name: 'Failed deployment to PROD', id: '291', to: {...STATUS_OPEN_FOR_TEST} }
const ACTION_321 = { name: 'Successful deployment to PROD', id: '321', to: {...STATUS_CLOSED} }
const ACTION_341 = { name: 'Assign to initiator', id: '341', to: {...STATUS_AUTHORIZED_FOR_PROD} }
const ACTION_261 = { name: 'In review for PROD', id: '261', to: {...STATUS_IN_REVIEW_FOR_PROD} }
const ACTION_211 = { name: 'Submit to eval for TEST', id: '211', to: {...STATUS_IN_EVAL_FOR_TEST} }
const ACTION_221 = { name: 'Submit to eval for PROD', id: '221', to: {...STATUS_IN_EVAL_FOR_PROD} }
const ACTION_11 = { name: 'Submit to eval for INT', id: '11', to: {...STATUS_IN_EVAL_FOR_INT} }
const ACTION_351 = { name: 'Open for TEST', id: '351', to: {...STATUS_OPEN_FOR_TEST} }
const ACTION_361 = { name: 'Open for PROD', id: '361', to: {...STATUS_OPEN_FOR_PROD} }

const ACTIONS = {
    [ACTION_141.id]:ACTION_141,
    [ACTION_151.id]:ACTION_151,
    [ACTION_171.id]:ACTION_171,
    [ACTION_161.id]:ACTION_161,
    [ACTION_181.id]:ACTION_181,
    [ACTION_191.id]:ACTION_191,
    [ACTION_231.id]:ACTION_231,
    [ACTION_241.id]:ACTION_241,
    [ACTION_251.id]:ACTION_251,
    [ACTION_301.id]:ACTION_301,
    [ACTION_311.id]:ACTION_311,
    [ACTION_331.id]:ACTION_331,
    [ACTION_271.id]:ACTION_271,
    [ACTION_281.id]:ACTION_281,
    [ACTION_291.id]:ACTION_291,
    [ACTION_321.id]:ACTION_321,
    [ACTION_341.id]:ACTION_341,
    [ACTION_261.id]:ACTION_261,
    [ACTION_211.id]:ACTION_211,
    [ACTION_221.id]:ACTION_221,
    [ACTION_11.id]:ACTION_11,
    [ACTION_351.id]:ACTION_351,
    [ACTION_361.id]:ACTION_361,
    [ACTION_201.id]:ACTION_201,
    [ACTION_81.id]:ACTION_81,
}
const WORKFLOW = {
    [STATUS_CLOSED.id]: [
      ACTION_81, // Reopen
      ACTION_201, // Cancel
    ],
    [STATUS_IN_EVAL_FOR_INT.id]: [
      ACTION_141, // In review for INT
      ACTION_201, // Cancel
    ],
    [STATUS_IN_REVIEW_FOR_INT.id]: [
      ACTION_151, // Authorize for Int
      ACTION_171, // Reject
      ACTION_201, // Cancel
    ],
    [STATUS_AUTHORIZED_FOR_INT.id]: [
      ACTION_161, // Failed Deployment to INT
      ACTION_181, // Assign to Initiator
      ACTION_191, // Successful deployment to INT
      ACTION_201, // Cancel
    ],
    [STATUS_IN_EVAL_FOR_TEST.id]: [
      ACTION_231, // In review for TEST
      ACTION_201, // Cancel
    ],
    [STATUS_IN_REVIEW_FOR_TEST.id]: [
      ACTION_241, // Reject
      ACTION_251, // Authorize for TEST
      ACTION_201, // Cancel
    ],
    [STATUS_AUTHORIZED_FOR_TEST.id]: [
      ACTION_301, // Failed deployment to TEST
      ACTION_311, // Successful deployment to TEST
      ACTION_331, // Assign to initiator
      ACTION_201, // Cancel
    ],
    [STATUS_IN_REVIEW_FOR_PROD.id]: [
      ACTION_271, // Reject
      ACTION_281, // Authorize for PROD
      ACTION_201, // Cancel
    ],
    [STATUS_AUTHORIZED_FOR_PROD.id]: [
      ACTION_291, // Failed deployment to PROD
      ACTION_321, // Successful deployment to PROD
      ACTION_341, // Assign to initiator
      ACTION_201, // Cancel
    ],
    [STATUS_IN_EVAL_FOR_PROD.id]: [
      ACTION_261, // In review for PROD
      ACTION_201, // Cancel
    ],
    [STATUS_OPEN_FOR_TEST.id]: [
      ACTION_211, // Submit to eval for TEST
      ACTION_201, // Cancel
    ],
    [STATUS_OPEN_FOR_PROD.id]: [
      ACTION_221, // Submit to eval for PROD
      ACTION_201, // Cancel
    ],
    [STATUS_OPEN_FOR_INT.id]: [
      ACTION_11, // Submit to eval for INT
      ACTION_351, // Open for TEST
      ACTION_361, // Open for PROD
      ACTION_201, // Cancel
    ],
}

module.exports = class {

    static ACTION_201 = ACTION_201
    static ACTION_81 = ACTION_81
    static ACTION_141 = ACTION_141
    static ACTION_151 = ACTION_151
    static ACTION_171 = ACTION_171
    static ACTION_161 = ACTION_161
    static ACTION_181 = ACTION_181
    static ACTION_191 = ACTION_191
    static ACTION_231 = ACTION_231
    static ACTION_241 = ACTION_241
    static ACTION_251 = ACTION_251
    static ACTION_301 = ACTION_301
    static ACTION_311 = ACTION_311
    static ACTION_331 = ACTION_331
    static ACTION_271 = ACTION_271
    static ACTION_281 = ACTION_281
    static ACTION_291 = ACTION_291
    static ACTION_321 = ACTION_321
    static ACTION_341 = ACTION_341
    static ACTION_261 = ACTION_261
    static ACTION_211 = ACTION_211
    static ACTION_221 = ACTION_221
    static ACTION_11 = ACTION_11
    static ACTION_351 = ACTION_351
    static ACTION_361 = ACTION_361

    static STATUS_CLOSED = STATUS_CLOSED
    static STATUS_IN_EVAL_FOR_INT = STATUS_IN_EVAL_FOR_INT
    static STATUS_IN_REVIEW_FOR_INT = STATUS_IN_REVIEW_FOR_INT
    static STATUS_AUTHORIZED_FOR_INT = STATUS_AUTHORIZED_FOR_INT
    static STATUS_IN_EVAL_FOR_TEST = STATUS_IN_EVAL_FOR_TEST
    static STATUS_IN_REVIEW_FOR_TEST = STATUS_IN_REVIEW_FOR_TEST
    static STATUS_AUTHORIZED_FOR_TEST = STATUS_AUTHORIZED_FOR_TEST
    static STATUS_IN_REVIEW_FOR_PROD = STATUS_IN_REVIEW_FOR_PROD
    static STATUS_AUTHORIZED_FOR_PROD = STATUS_AUTHORIZED_FOR_PROD
    static STATUS_IN_EVAL_FOR_PROD = STATUS_IN_EVAL_FOR_PROD
    static STATUS_OPEN_FOR_TEST = STATUS_OPEN_FOR_TEST
    static STATUS_OPEN_FOR_PROD = STATUS_OPEN_FOR_PROD
    static STATUS_OPEN_FOR_INT = STATUS_OPEN_FOR_INT

    static INITIAL_STATUS = STATUS_OPEN_FOR_INT
    static getTransitionsByStatusId(statusId) {
        return WORKFLOW[statusId]
    }

    static getTransitionById(transitionId) {
        return ACTIONS[transitionId]
    }
}
