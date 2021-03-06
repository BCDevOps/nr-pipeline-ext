// @ts-nocheck
'use strict'

const { childProcess } = require('./util-functions')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

module.exports = class GitOp {
    constructor(settings) {
        this.settings = settings
        this.tmpCredStoreFile = path.resolve(require('os').tmpdir(), `.git-credentials-${process.pid}`)
    }
    // Get Merge Base

    run(args) {
        return new Promise((resolve, reject) => {
            const child = spawn('git', args, { cwd: this.settings.dir })
            let stdout = ''
            let stderr = ''
            child.stderr.on('data', data => {
                stderr += data
            })
            child.stdout.on('data', data => {
                stdout += data
            })
            child.on('exit', exitCode => {
                // console.log(`> git ${args.join(' ')} # ${exitCode}`)
                if (exitCode === 0) {
                    resolve({ stdout, stderr, exitCode })
                } else {
                    reject(
                        new Error({
                            stdout,
                            stderr,
                            exitCode,
                            cwd: this.settings.dir,
                        })
                    )
                }
            })
        })
    }

    /**
     * Set GIT credentials to be used by any git command tht needs remote access (e.g.: fetch)
     * @param {*} workDir
     * @param {*} remoteUrl
     * @param {*} cred
     * @todo https://alanedwardes.com/blog/posts/git-username-password-environment-variables/
     */
    _setupCredentials(workDir, remoteUrl, cred) {
        // git config --global credential.helper 'store --file ~/.git-credentials'
        // git credential-store --file ~/.git-credentials store < .gitcredentials
        // result: https://fakeUsername:fakePass@apps.nrs.gov.bc.ca
        const gitCredentialHelper = `store --file=${this.tmpCredStoreFile}`
        return (
            Promise.resolve(true)
                // Check if 'credential.helper' has been set
                .then(() => {
                    return childProcess('git', ['config', '--local', 'credential.helper'], { cwd: workDir })
                })
                // if 'credential.helper' has NOT been set, it wil exit with code 1
                .catch(proc => {
                    // anything other than exit 1 is an unexpected error
                    if (proc.data.exitCode !== 1) {
                        return Promise.reject(proc)
                    }
                    return Promise.resolve(true)
                        .then(() => {
                            const host = new URL(remoteUrl).host
                            fs.writeFileSync(
                                this.tmpCredStoreFile,
                                `https://${cred.username}:${cred.password}@${host}\n`,
                                { encoding: 'utf8' }
                            )
                        })
                        .then(() => {
                            return childProcess(
                                'git',
                                ['config', '--local', 'credential.helper', gitCredentialHelper],
                                { cwd: workDir }
                            )
                        })
                        .then(() => {
                            // register a exit hook to delete the temporary file
                            process.once('exit', code => {
                                if (fs.existsSync(this.tmpCredStoreFile)) {
                                    console.log(`Deleting ${this.tmpCredStoreFile}`)
                                    fs.unlinkSync(this.tmpCredStoreFile)
                                }
                            })
                        })
                })
        )
    } // _setupGitGlobalCredential

    clear() {
        if (fs.existsSync(this.tmpCredStoreFile)) {
            console.log(`Deleting ${this.tmpCredStoreFile}`)
            fs.unlinkSync(this.tmpCredStoreFile)
        }
    }

    getMergeBase(changeBranch, changeTarget) {
        return this.run(['merge-base', `remotes/origin/${changeBranch}`, `remotes/origin/${changeTarget}`]).then(
            output => {
                return output.stdout.split('\n')[0]
            }
        )
    }

    // Get latest Commit
    getLatestCommitOnTarget(changeTarget) {
        return this.run(['rev-parse', `remotes/origin/${changeTarget}`]).then(output => {
            return output.stdout.split('\n')[0]
        })
    }

    // Verify that latest commit is equal to merge-base commit
    isTargetBranchOutofSync() {
        return this._setupCredentials(this.settings.dir, this.settings.url, this.settings.credentials).then(() => {
            return this.getMergeBase(this.settings.branch.name, this.settings.change.target).then(commitHash1 => {
                return this.getLatestCommitOnTarget(this.settings.change.target).then(commitHash2 => {
                    return new Promise(resolve => {
                        console.log(`Source Branch Common Ancestor commit: ${commitHash1}`)
                        console.log(`Target Branch Last Commit - commitHash2: ${commitHash2}`)
                        if (commitHash1 === commitHash2) {
                            resolve(true)
                        } else {
                            throw new Error(
                                '\n --------------------------------------- \n Status: Cannot be Merged! \n Reason: Your branch is out of sync from target. \n Solution: Rebase, push and then run the Pipeline \n  ---------------------------------------'
                            )
                        }
                    })
                })
            })
        })
    }
} // end GitOp class
