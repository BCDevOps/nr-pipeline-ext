# nr-pipeline-ext
Natural Resource (IIT) Module/Extension for pipeline-cli

How to use :

  1. BasicJavaApplicationBuilder.js : This is a class which needs to be called from within the build.js file located in the .pipeline folder in your repository . It is used to build openshift objects for a Java application and also create RFD tickets given an RFC exists.

  2. BasicJavaApplicationClean.js : This is a class which needs to be called from within the clean.js file located in the .pipeline folder in your repository . It is used to clean transient(build and dev or as defined in config.js) openshift objects.

  3. BasicJavaApplicationDeployer.js : This is a class which needs to be called from within the deploy.js file located in the .pipeline folder in your repository . It is used to deploy openshift objects for a Java application and also transition RFD tickets for the given environment to Resolved state.

  4. basicOracleDatabaseBuild.js : This is a script which can be used directly . It is used to create RFD tickets given an RFC exists for a Database Migration Pipeline

  5. basicOracleDatabaseBuild.js : This is a script which can be used directly . It uses Liquibase to migrate Database objects and transition RFD tickets to Resolved.

  6. constants.js : Contains the definition of constants used by other scripts.

  7. CreateChangesetUpdateChangelog: This is a class which is called from the script ,generateChangeSetforOracleDB.js. It is used for creating empty changelog files and update the corresponding changelog.

  8. generateChangeSetforOracleDB.js: This script can be directly used from your repo. It can be used as follows (given that node knows generate should execute this script):
  
  ```
    If migrations folder path is ../migrations ,run: npm run generate
    If migrations folder path is custom path ,run: npm run generate -- --migrations.dir=<custom_path_relative_to_.pipeline>
    For Help, run: npm run generate -- help 
    
   ```
   
  It asks a series of questions to create Repeatable or Versioned Migration changesets and update the respective changelog.
    
    ```
    ? Do you want to add a new changeset(y/n, Press y for yes, any other key for no)?  y
    ? What type of migration would you want to do? Repeatable
    ? Which Schema are you modifying? CWI_TXN
    ? What is your name? posivana
    ? What is the path to the folder(relative to .pipeline) which holds the changelog and changesets for each schema in your REPO (default: ../migrations)? ../migrations
    ? What is the type of the database object you are creating/modifying? package
    ? What is the name of the database object you are creating/modifying? new_tes_package

    ```
    
   Any special character like whitespace, #, - etc are converted to _ in the database object name and the database object name is used as the ID in the changelog configuration. If the script finds a changelog ID with the same object name, it is assumed that it should be a repeatable migration and therefore, the previous changeset can be updated or modified to run the change.
    The script assumes that the default path for scripts is in repo/migrations, if not, you will need to provide the path to the script.

  9. GitOperation.js : This is class and is used by other scripts to perform Git Operations

  10. GitVerification.js : This is a class (invoked from the BasicJavaApplicationBuilder and basicOracleDatabaseBuild.js ) which verifies if a bitbucket branch can be merged with the target branch in a pull request by verifying if the commit Hash on the target from which the current branch was created is still the same as the current commitHash on the target. If not, there have been new changes made on the target and you will need to update and rebase your branch using the following steps:
   
   ```
    git ls-remote origin refs/heads/master #Returns the latest commit Hash on master
    git rebase LATEST_COMMIT_HASH
    git pull origin --rebase
    git config --global push.default simple
    git push -f
  ```
  
  Verify that the change is updated using:
  
  `git merge-base remotes/origin/YOUR_BRANCH remotes/origin/TARGET`
   
11. InputDeployerVerify.js : This is a class which is invoked from the BasicJavaApplicationDeployer.js, basicOracleDatabaseDeployment.js and jiraEventListenerScriptforJenkins . This class verifies if the following Jira conditions are satisfied prior to Deployments:

    ``` 
    ENV = dlvr or int
       * RFC should be Authorized to Int 
       * RFD to DLVR (auto) should be approved
       * If manual RFD exists and blocks the RFD(auto), it should be resolved
       * If manual RFD exists and doesnt block the RFD(auto), it should be approved
    ENV = test
       * RFC should be Authorized to Test
       * RFDs to DLVR (auto and manual) should be closed
       * RFD to Test (auto) should be approved
       * If manual RFD exists and blocks the RFD(auto), it should be resolved
       * If manual RFD exists and doesnt block the RFD(auto), it should be approved
     ENV = prod
       * RFC should be Authorized to Prod
       * RFDs to Test (auto and manual) should be closed
       * RFD to Prod (auto) should be approved
       * If manual RFD exists and blocks the RFD(auto), it should be resolved
       * If manual RFD exists and doesnt block the RFD(auto), it should be approved
    ```

12. InputMergePr.js : This is a class invoked from jiraEventListenerScriptForMerge.js and is used to verify the following conditions prior to performing clean out operations in a Jenkins pipeline.

     ```
        * RFC should be closed
        * RFD to Prod should be closed 
     ```
13. Jira.js : This is a class used by other modules to perform Jira Operations. This uses the jira-connector npm module.

14. jiraEventListenerScriptForJenkins.js: This script is run by a jenkins event handler job to verify Jira events. This job sends an input signal to the pipeline waiting for approvals.

15. jiraEventListenerScriptForMerge.js: This script is run by a jenkins event handler job to trigger clean out events. This job initiates the Pull Request Merge.

16. Liquibase.js: This class mocks the liquibase command line to perform different operations such as migrate, rollback, status, version etc.

17. MavenRepository.js: This class is used from within other modules to download the maven dependencies from the BC Gov artifactory

18. mergePR.js: This script runs when a bitbucket Pull Request is merged, deleted or declined and cleans openshift objects and deletes the source branch.


Scripts not mentioned in this README are still under construction and not ready to be used.
