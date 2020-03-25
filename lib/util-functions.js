/* eslint prefer-promise-reject-errors: 0 */
'use strict'
const { spawn } = require('child_process')
const { ENV } = require('./constants')

function previousEnv(env) {
    const stage = {
        [ENV.DLVR]: {
            before: ENV.BUILD,
        },
        [ENV.TEST]: {
            before: ENV.DLVR,
        },
        [ENV.PROD]: {
            before: ENV.TEST,
        },
    }
    return stage[env].before
}

async function childProcess(...args) {
    const cp = spawn(...args)
    return new Promise((resolve, reject) => {
        cp.on('error', err => {
            reject(err)
        })

        cp.on('close', exitCode => {
            if (exitCode === 0) {
                return resolve({ stdout, stderr, exitCode })
            } else {
                // console.error("ChildProcess: " + args + ".\nOn close with non-zero exist code: " + exitCode);
                reject({ stdout, stderr, exitCode })
            }
        })
        cp.on('exit', exitCode => {
            if (exitCode === 0) {
                return resolve({ stdout, stderr, exitCode })
            } else {
                reject({ stdout, stderr, exitCode })
            }
        })

        let stdout = ''
        let stderr = ''
        cp.stderr.on('data', data => {
            stderr += data
        })
        cp.stdout.on('data', data => {
            stdout += data
        })
    })
} // end childProcess()

module.exports = { childProcess, previousEnv }
