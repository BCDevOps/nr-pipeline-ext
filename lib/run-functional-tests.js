"use strict";

const config = require(`${process.cwd()}/lib/config.js`);
const path = require('path');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

(async function () {
  const targetEnv = config.options.env;
  console.log(`Working under directory: ${process.cwd()}`)
  console.log(`TARGET_ENV: ${targetEnv}`)

  // current phase settings
  const uitestConfig = {
      srcFolderName: 'functional-testing', // default test folder name
      skip: true, // default
      runCommand: "node ./node_modules/selenium-cucumber-js/index.js -d -s ./step-definitions -b headlessChromeDriver.js" // sample command
  };
  if (config.phases[targetEnv] !== undefined && config.phases[targetEnv].uitest !== undefined) {
    const userConfig = config.phases[targetEnv].uitest;
    uitestConfig.srcFolderName = (userConfig.srcFolderName && userConfig.srcFolderName.trim() != '') ? userConfig.srcFolderName : uitestConfig.srcFolderName;
    uitestConfig.skip = (userConfig.skip != undefined) ? userConfig.skip : uitestConfig.skip;
    uitestConfig.runCommand = (userConfig.runCommand && userConfig.runCommand.trim() != '') ? userConfig.runCommand : uitestConfig.runCommand;
  }

  if (uitestConfig.skip) {
    console.log("Skipping functional tests ");
    process.exit(0);
  }

  const testFolderDir = path.resolve(process.cwd(), `../${uitestConfig.srcFolderName}/`);
  console.log("Resolved Test Folder Dir", testFolderDir);
  fs.access(testFolderDir, function(error) {
      if (error) {
        console.error("Directory does not exist or no permissoin.", error);
        process.exit(1);
      }
  })

  try {
    const { stdout, stderr } = await exec(`${uitestConfig.runCommand}`, {cwd: `${testFolderDir}`, env: {'TARGET_ENV': targetEnv}});
    console.log(`Finished running test:`, stdout);
    process.exit(0);
  }
  catch(error) {
    console.error("Error: Command execution failed: ", error);
    process.exit(1);
  }

})();

