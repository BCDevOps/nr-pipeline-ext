'use strict';
const {spawn}  = require("child_process");

async function childProcess(...args) {
  const cp = spawn(...args);
  return new Promise((resolve, reject)=> {
    cp.on("error", (err) => {
      reject(err);
    });

    cp.on("close", (code) => {
      if (code == 0) {
        return resolve(code);
      }
      else {
        reject(new Error("ChildProcess: " + args + ".\nOn close with non-zero exist code: " + code));
      }
    });
    cp.on("exit", (code) => {
      if (code == 0) {
        return resolve(code);
      }
      else {
        reject(new Error("ChildProcess: " + args + ".\nOn exit with non-zero exist code: " + code));
      }
    });
    //  open comment only for debug purpose
    // cp.stdout.on("data", (data) => {
    //   console.log(`${data}`)
    // })
  });
} // end childProcess()

module.exports = {childProcess}