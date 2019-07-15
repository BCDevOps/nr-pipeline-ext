# nr-pipeline-ext
Natural Resource (IIT) Module/Extension for pipeline-cli

Documentation for performing Jira RFC-RFD workflow using NPM

# ./jira-update.js

   - This file is used to create the RFD( Request for Deployment) tasks before deployment to each environment and link them to the existing RFC (Request for Change).
   - The RFDs need to be created and approved before the application is deployed in the three environments, dev, test and prod
   - Command to run
   ``` cd .pipeline && ${WORKSPACE}/npmw ci && JIRA_USER=${USERNAME} JIRA_PASS=${PASSWORD} JIRA_RFC=${RFC_ISSUE_KEY} JIRA_CHANGE_BRANCH=${CHANGE_BRANCH} JIRA_ENV=dev REVIEWER=QA JIRA_BRANCH_NAME=${BRANCH_NAME} ${WORKSPACE}/npmw run jira-update --git.branch.name=${BRANCH_NAME} --git.branch.merge=${CHANGE_BRANCH} --git.branch.remote=${CHANGE_BRANCH} --git.url=${GIT_URL} ```

   - This command can be run from your local workstation or from jenkins
   - When the jira-update.js is called for each environment:
        - it checks if there are links present to the existing RFC, which imply that the RFD tasks are already there and need not be created again (in case where the PR build already ran and was aborted due to errors)
        - if RFD tasks are already there, their transition status is reset to submitted
        - if RFD tasks are not present, they are created and transitioned to submitted

   - The RFD task approval happens outside the code and the pipeline

# ./jira-transition.js

   - This file is used to transition the RFD( Request for Deployment) tasks after deployment to each environment to resolved state
   - The RFDs need to be created and approved before the application is deployed in the three environments, dev, test and prod
   - Command to run
   ``` cd .pipeline && ${WORKSPACE}/npmw ci && JIRA_USER=${USERNAME} JIRA_PASS=${PASSWORD} JIRA_RFC=${RFC_ISSUE_KEY}  JIRA_ENV=dev  ${WORKSPACE}/npmw run jira-transition --git.branch.name=${BRANCH_NAME} --git.branch.merge=${CHANGE_BRANCH} --git.branch.remote=${CHANGE_BRANCH} --git.url=${GIT_URL} ```

   - This command can be run from your local workstation or from jenkins
   - When the jira-transition.js is called for each environment:
        - it fetches the RFD task and Subtask key and status based on the current environment
        - Transitions the task and subtask to Resolved


JIRA WORKFLOW for RFC-RFD process

![RFD Workflow](../RFD/workflow.png)

