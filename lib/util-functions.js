'use strict';
const {spawn}  = require("child_process");
const fs = require('fs');

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

// Add or append 'text' to 'file'
function writeToFile(file, text, append) {
  return new Promise((resolve, reject) => {
      if (append) {
          fs.appendFile(file, text, err => {
              if (err) reject(err);
              else resolve();
          });
      }
      else {
          fs.writeFile(file, text, err => {
              if (err) reject(err);
              else resolve();
          });
      }
  });
} 

module.exports = {childProcess, writeToFile}