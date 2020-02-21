"use strict";

const config = require(`${process.cwd()}/lib/config.js`);
const {OpenShiftClientX} = require('pipeline-cli')
const path = require('path');
const fs = require('fs');
// const util = require('util');
// const exec = util.promisify(require('child_process').exec);
const {childProcess} = require('./util-functions')
const spawn = require('child_process').spawn;

(async function () {
  const options = config.options;
  const targetEnv = options.env;
  console.log(`Working under directory: ${process.cwd()}`);
  console.log(`Target environment: ${targetEnv}`);
  console.log(`User provided arguments: ${options}`);

  const currentPhase = config.phases[targetEnv];
  const oc = new OpenShiftClientX(Object.assign({ namespace: currentPhase.namespace }, options));
  const routeSpce = oc.get('route', {selector:`app=${currentPhase.instance},env-id=${currentPhase.changeId},github-owner=${oc.git.owner}`, namespace: currentPhase.namespace})[0].spec;
  const targetUrl = "".concat(routeSpce.tls.termination === 'edge'? 'https' : 'http', '://', routeSpce.host, routeSpce.path);
  console.log(`Targeted URL for testing is retrived as: '${targetUrl}' for environment: ${targetEnv}`);

  // current phase settings
  const npmw = path.join(path.dirname(process.cwd()), 'npmw');
  const uitestConfig = {
      srcFolderName: 'functional-testing', // default test folder name, relative to project folder
      skip: 'false', // default
      // runCommand: `${npmw} ci && ${npmw} run headless-chrome-tests`, // sample command
      env: {'TARGET_ENV': targetEnv, 'TARGET_TESTING_URL': targetUrl}
  };
  if (currentPhase.uitest !== undefined) {
    const userConfig = currentPhase.uitest;
    uitestConfig.srcFolderName = (userConfig.srcFolderName && userConfig.srcFolderName.trim() != '') ? userConfig.srcFolderName : uitestConfig.srcFolderName;
    uitestConfig.skip = (process.env.UITEST_SKIP != undefined) ? process.env.UITEST_SKIP : uitestConfig.skip;
    // uitestConfig.runCommand = (userConfig.runCommand && userConfig.runCommand.trim() != '') ? userConfig.runCommand : uitestConfig.runCommand;
    (userConfig.env != undefined) ? Object.assign(uitestConfig.env, userConfig.env) : Object.assign(uitestConfig.env);
  }

  if (uitestConfig.skip && uitestConfig.skip.trim() === 'true') {
    console.log("User UITEST_SKIP is set. Skipping functional tests.");
    process.exit(0);
  }

  const testFolderDir = path.resolve(process.cwd(), `../${uitestConfig.srcFolderName}/`);
  console.log("Resolved Testing Folder Dir:", testFolderDir);
  // console.log("Run Command: ", uitestConfig.runCommand);
  fs.access(testFolderDir, function(error) {
      if (error) {
        console.error("Directory does not exist or no permissoin.", error);
        process.exit(1);
      }
  })

  console.log("User config environment: ", uitestConfig.env);
  // const { stdout, stderr } = await exec(`${uitestConfig.runCommand}`, {cwd: `${testFolderDir}`, env: uitestConfig.env});

  childProcess(npmw, ['ci'], {cwd: testFolderDir})
    .then(() => childProcess(npmw, ['run', 'headless-chrome-tests'], {cwd: testFolderDir, env: uitestConfig.env}))
    .then((result) => {
      console.log(`Finished running test:`, result.stdout);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error: Command execution failed: ", error);
      process.exit(1);
    });

})();