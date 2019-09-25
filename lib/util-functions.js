'use strict';
const {spawn}  = require("child_process");

async function childProcess(...args) {
  const cp = spawn(...args);
  return new Promise((resolve, reject)=> {
    cp.on("error", (err) => {
      reject(err);
    });

    cp.on("close", (exitCode) => {
      if (exitCode == 0) {
        return resolve({stdout,stderr,exitCode});
      }
      else {
        // console.error("ChildProcess: " + args + ".\nOn close with non-zero exist code: " + exitCode);
        reject({stdout,stderr,exitCode})
      }
    });
    cp.on("exit", (exitCode) => {
      if (exitCode == 0) {
        return resolve({stdout,stderr,exitCode});
      }
      else {
        // console.error("ChildProcess: " + args + ".\nOn exit with non-zero exist code: " + exitCode);
        reject({stdout,stderr,exitCode})
      }
    });

    let stdout = ""
    let stderr = ""
    cp.stderr.on('data', (data) => {
       stderr += data;
    })
    cp.stdout.on('data', (data) => {
       stdout += data;
    });
  });
} // end childProcess()

module.exports = {childProcess}