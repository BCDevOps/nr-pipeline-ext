'use strict'
const Jira = require('./Jira')
const { ENV, ISSUE_LINK_TYPE_NAME, ISSUE_STATUS_NAME, VERIFY_STATUS, REASON } = require('./constants')
const { previousEnv } = require('./util-functions')

module.exports = class {
  constructor (settings) {
    this.settings = settings
  }

  async verifyBeforeDeployment () {
    const env = this.settings.options.env.toLowerCase()
    const changeBranch = this.settings.options.git.branch.merge
    const key = changeBranch.split('-')
    const rfcIssueKey = key[0] + '-' + key[1]

    const result = await this.isReadyForDeployment(env, rfcIssueKey)

    this._printVerifiedStatus(result)
    return result.status
  } // verifyBeforeDeployment

  /**
    * Return a summary of RFC/RFD(s) context based on 'rfcIssueKey and 'env' requested.
    * Random Example JSON:
    * {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"Authorized for Int",
    * "rfdsByEnv":{"test": {rfds":[{"issueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Closed",
    * "blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Some Other Status","blockingOn":"RFD-AUTO-TEST-01"},{"issueKey":"INWARDISSUE-1","status":"Resolved","blockingOn":"RFD-AUTO-TEST-01"}]},
    * {"issueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Some Other Status","blockingOn":"RFD-BUSINESS-TEST-01"},
    * {"issueKey":"INWARDISSUE-1","status":"Some Other Status","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-2","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"}]}],
    * "previousEnvRfds":[ {"issueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Closed","labels":"auto"}]}}}
    */
  async obtainCurrentRfcRfdContext (env, rfcIssueKey) {
    const jiraUrl = this.settings.jiraUrl
    const username = this.settings.phases[env].credentials.idir.user
    const password = this.settings.phases[env].credentials.idir.pass

    const jiraSettings = {
      url: jiraUrl,
      username: username,
      password: password,
      rfcIssueKey: rfcIssueKey
    }
    const jiraClient = new Jira(Object.assign({ phase: 'jira-transition', jira: jiraSettings }))

    const prevEnv = previousEnv(env)
    const rfcIssue = await jiraClient.retrieveRfcIssueInfo(rfcIssueKey)
    if (rfcIssue === null || rfcIssue === undefined) {
      throw new Error(`Could not find RFC issue with issueKey ${rfcIssueKey}`)
    }

    // for building RFC/RFD(s) context return.
    const rfcRfdContext = { rfcIssueKey, rfcStatus: rfcIssue.fields.status.name, rfdsByEnv: { [env]: { rfds: [], previousEnvRfds: [] } } }

    // get RFC-RFD issue links
    for (const rfdIssueLinkInfo of rfcIssue.fields.issuelinks) {
      // RFD issues
      if (rfdIssueLinkInfo.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD) {
        const issueKey = rfdIssueLinkInfo.outwardIssue.key
        const rfdContext = { issueKey }
        // RFD issue detail
        const rfdInfo = await jiraClient.getIssue(issueKey)
        rfdContext.labels = rfdInfo.fields.labels
        if (rfdInfo.fields.customfield_10121.value.toLowerCase() === env) {
          rfdContext.env = rfdInfo.fields.customfield_10121.value
          rfdContext.status = rfdInfo.fields.status.name
          // gather RFD issue links
          const issueLinks = rfdInfo.fields.issuelinks
          rfdContext.blockedBy = []
          if (issueLinks) {
            for (const link of issueLinks) {
              if (link.type.inward === 'is blocked by') {
                rfdContext.blockedBy.push({
                  issueKey: link.inwardIssue.key,
                  status: link.inwardIssue.fields.status.name,
                  blockingOn: issueKey
                })
              }
            }
          }
          rfcRfdContext.rfdsByEnv[env].rfds.push(rfdContext)
        }

        // previousRfd
        if (rfdInfo.fields.customfield_10121.value.toLowerCase() === prevEnv) {
          const previousIssue = {
            issueKey,
            env: prevEnv,
            status: rfdInfo.fields.status.name,
            labels: rfdInfo.fields.labels
          }
          rfcRfdContext.rfdsByEnv[env].previousEnvRfds.push(previousIssue)
        }
      } // end rfd link type = RFC-RFD
    }

    return rfcRfdContext
  } // obtainCurrentRfcRfdContext

  /**
    * Check current RFC/RFD(s) context for their status and blocked issues based on env.
    * When verification success, return {status: 'Ready', rfcRfdContext}. 'rfcRfdContext'
    *       is the information obtained from JIRA RFC/RFD based on 'env' on that requsted time.
    * When verification is failed, return {status: 'Not Ready', reason: {...}, rfcRfdContext}.
    * Only when verification is failed then the object contains 'reason' property.
    * @param {*} env environment to check
    * @param {*} rfcIssueKey the RFC issue for this deployment
    */
  async isReadyForDeployment (env, rfcIssueKey) {
    console.log(`\n#----------  Verifying Deployment Conditions for targetEnv=${env} with RFC issue=${rfcIssueKey}  ----------#\n`)

    const rfcRfdContext = await this.obtainCurrentRfcRfdContext(env, rfcIssueKey)
    const result = { status: null, rfcRfdContext, reason: {} } // default return object;

    // collecting current stage invalid status RFD(s)
    const notResolvedBlockByIssues = []
    const notApprovedRfds = []
    rfcRfdContext.rfdsByEnv[env].rfds.forEach((rfd) => {
      // all blockedBy issue 'Resolved'?
      console.info(`Checking RFD: ${rfd.issueKey} on blockedBy issues...`)
      rfd.blockedBy.forEach((blockedByIssue) => {
        if (blockedByIssue.status !== ISSUE_STATUS_NAME.RESOLVED) {
          notResolvedBlockByIssues.push(blockedByIssue)
        }
      })

      // has RFD been approved?
      console.info(`Checking RFD: ${rfd.issueKey} on '${ISSUE_STATUS_NAME.APPROVED}' status...`)
      if (rfd.status !== ISSUE_STATUS_NAME.APPROVED) {
        notApprovedRfds.push(rfd)
      }
    })

    if (notResolvedBlockByIssues && notResolvedBlockByIssues.length > 0) {
      console.warn('RFD(s) contains un-resolved blocking issues: %o', notResolvedBlockByIssues)
      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_RFD_BLOCKED] = {
        description: REASON.REASON_DESC_RFD_BLOCKED,
        issueItems: notResolvedBlockByIssues
      }
    }

    if (notApprovedRfds && notApprovedRfds.length > 0) {
      console.warn('RFD(s) contains non-Approved issues: %o', notApprovedRfds)
      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_RFD_NOT_APPROVED] = {
        description: REASON.REASON_DESC_RFD_NOT_APPROVED,
        issueItems: notApprovedRfds
      }
    }

    // collecting previous stage invalid status RFD(s)
    const notClosedPreviousStageIssues = []
    rfcRfdContext.rfdsByEnv[env].previousEnvRfds.forEach((previousEnvRfd) => {
      // all issue 'Closed'?
      console.info(`Checking previous RFD: ${previousEnvRfd.issueKey} for '${ISSUE_STATUS_NAME.CLOSED}' status...`)
      if (previousEnvRfd.status !== ISSUE_STATUS_NAME.CLOSED) {
        notClosedPreviousStageIssues.push(previousEnvRfd)
      }
    })
    if (notClosedPreviousStageIssues && notClosedPreviousStageIssues.length > 0) {
      console.warn('Contains not closed RFD issues: %o', notClosedPreviousStageIssues)
      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED] = {
        description: REASON.REASON_DESC_PREVIOUS_RFD_NOT_CLOSED,
        issueItems: notClosedPreviousStageIssues
      }
    }

    console.info(`Checking RFC: ${rfcIssueKey} for valid approval status...`)
    const rfcStatus = rfcRfdContext.rfcStatus
    if (((env === ENV.DLVR || env.toLowerCase() === 'int') && rfcStatus.toLowerCase() !== ISSUE_STATUS_NAME.AUTHORIZEDFORINT.toLowerCase()) ||
         (env === ENV.TEST && rfcStatus.toLowerCase() !== ISSUE_STATUS_NAME.AUTHORIZEDFORTEST.toLowerCase()) ||
         (env === ENV.PROD && rfcStatus.toLowerCase() !== ISSUE_STATUS_NAME.AUTHORIZEDFORPROD.toLowerCase())) {
      console.warn(`Invalid RFC status ${rfcStatus} before deployment on env ${env}`)

      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_RFC_NOT_AUTHORIZED] = {
        description: REASON.REASON_DESC_RFC_NOT_AUTHORIZED,
        issueItems: [{ issueKey: rfcIssueKey, status: rfcStatus, env }]
      }
    }

    // finally all verified.
    if (Object.keys(result.reason).length === 0) {
      result.status = VERIFY_STATUS.READY
      delete result.reason
      console.info(`RFC: ${rfcIssueKey} is valid for ${env} deployment`)
    }

    console.log('\n#-------------------------------------------------------------------------------------------------------#\n\n')
    return result
  } // end isReadyForDeployment

  /**
    * Internal function to print statement for user about Readiness Check for the deployment based on verification
    * 'result'(and its object structure) received from function 'isReadyForDeployment'.
    * @param {*} verifiedResult the 'result' object to perform print statment logic from.
    */
  _printVerifiedStatus (verifiedResult) {
    const chalk = require('chalk')
    // Internal class only for this function.
    class RfdTableItem {
      constructor (issueKey, env, status, labels, blockedBy) {
        this.issueKey = issueKey
        this.env = env
        this.status = status
        this.labels = labels
        if (blockedBy) {
          this.blockedBy = blockedBy
        }
      }
    };

    console.log('\n#---------------------------###  STATUS OF READINESS CHECK FOR DEPLOYMENT  ###--------------------------#\n')

    const boldRedStyle = chalk.bold.red
    const actionRequiredTxtStyle = chalk.bold.yellowBright
    const rfcRfdContext = verifiedResult.rfcRfdContext
    const env = Object.keys(rfcRfdContext.rfdsByEnv)[0]
    const reasonCodes = verifiedResult.reason ? Object.keys(verifiedResult.reason) : null

    // RFC status
    console.info('RFC status: ')
    console.table([{ RFC: rfcRfdContext.rfcIssueKey, status: rfcRfdContext.rfcStatus, 'target env': env }])
    console.log('\n')
    if (reasonCodes && reasonCodes.includes(REASON.REASON_CODE_RFC_NOT_AUTHORIZED)) {
      console.warn(boldRedStyle('ACTION REQUIRED:'))
      const notAuthorizedRfc = verifiedResult.reason[REASON.REASON_CODE_RFC_NOT_AUTHORIZED].issueItems[0]
      console.group()
      console.log(actionRequiredTxtStyle(`RFC '${notAuthorizedRfc.issueKey}' has not been authorized to '${env}'. Please authorize the RFC to '${env}' before deployment.`))
      console.groupEnd()
      console.log('\n')
    }

    // RFD(s)
    const rfds = rfcRfdContext.rfdsByEnv[env].rfds
    const rfdrows = []
    rfds.forEach((rfd) => {
      const blockedBySt = rfd.blockedBy.map(issue => issue.issueKey + '(' + issue.status + ')').join(', ')
      const rfdRow = new RfdTableItem(rfd.issueKey, rfd.env, rfd.status, rfd.labels, blockedBySt)
      rfdrows.push(rfdRow)
    })
    console.info('Current Environment RFD Status:')
    console.table(rfdrows)
    console.log('\n')
    if (reasonCodes && (reasonCodes.includes(REASON.REASON_CODE_RFD_BLOCKED) || reasonCodes.includes(REASON.REASON_CODE_RFD_NOT_APPROVED))) {
      if (reasonCodes.includes(REASON.REASON_CODE_RFD_BLOCKED)) {
        console.warn(boldRedStyle('ACTION REQUIRED:'))
        const blockedIssueItems = verifiedResult.reason[REASON.REASON_CODE_RFD_BLOCKED].issueItems
        console.group()
        blockedIssueItems.forEach((issue) => {
          const blockedBySt = issue.issueKey + '(' + issue.status + ')'
          console.log(actionRequiredTxtStyle(`RFD '${issue.blockingOn}' is blocked by un-resolved issue(s): '${blockedBySt}'. Please resolve blocking issue(s) before deployment to '${env}'.`))
        })
        console.groupEnd()
        console.log('\n')
      }

      if (reasonCodes.includes(REASON.REASON_CODE_RFD_NOT_APPROVED)) {
        console.warn(boldRedStyle('ACTION REQUIRED:'))
        const notApprovedIssueItems = verifiedResult.reason[REASON.REASON_CODE_RFD_NOT_APPROVED].issueItems
        console.group()
        notApprovedIssueItems.forEach((issue) => {
          console.log(actionRequiredTxtStyle(`Current environment RFD '${issue.issueKey}' has not been approved. Please approve the issue before deployment to '${env}'.`))
        })
        console.groupEnd()
        console.log('\n')
      }
    }

    const previousEnvRfds = rfcRfdContext.rfdsByEnv[env].previousEnvRfds
    const prfdRows = []
    previousEnvRfds.forEach((rfd) => {
      const prfdRow = new RfdTableItem(rfd.issueKey, rfd.env, rfd.status, rfd.labels)
      prfdRows.push(prfdRow)
    })
    console.info('Previous Environment RFD Status:')
    if (prfdRows && prfdRows.length > 0) {
      console.table(prfdRows)
      console.log('\n')
    } else {
      console.group()
      console.info('N/A')
      console.groupEnd()
      console.log('\n')
    }
    if (reasonCodes && reasonCodes.includes(REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED)) {
      console.warn(boldRedStyle('ACTION REQUIRED:'))
      const notClosedIssueItems = verifiedResult.reason[REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED].issueItems
      console.group()
      notClosedIssueItems.forEach((issue) => {
        console.log(actionRequiredTxtStyle(`Previous environment RFD '${issue.issueKey}' has not been closed. Please close the issue before deployment to '${env}'.`))
      })
      console.groupEnd()
      console.log('\n')
    }

    if (reasonCodes) {
      console.log('\n')
      // console.log(boldRedStyle(`==> (Not Ready to deploy to '${env}' environment) <==`));
      // =>   NOT READY
      console.log('=>    NOT READY')
    } else {
      console.log('\n')
      // const readyToDeployTxtStyle = chalk.bold.greenBright
      // console.log(readyToDeployTxtStyle(`==> (Ready to deploy to '${env}' environment) <==`));
      console.log('=>   READY')
    }

    // console.log("\n#-------------------------------------------------------------------------------------------------------#\n");
  }
} // class
