'use strict'
const fs = require('fs')
// const { childProcess } = require('./util-functions')
const { spawnSync } = require('child_process')
const Rsync = require('rsync')
const inquirer = require('inquirer')

module.exports = class {
    constructor() {
        this.cwd = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).stdout.trim()
    }

    __isDir(path) {
        try {
            const stat = fs.lstatSync(path)
            return stat.isDirectory()
        } catch (err) {
            // lstatSync throws an error if path doesn't exist
            return false
        }
    }

    __earFolderShouldExist() {
        const doesEarExist = this.__isDir('../ear')
        if (!doesEarExist) {
            const doesSrcExist = this.__isDir('../src')
            if (doesSrcExist) {
                fs.mkdirSync('../ear')
                // const cwd = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).stdout.trim()
                // console.log(cwd)
                const args = ['../src', '../ear']
                const child = spawnSync('mv', args, { encoding: 'utf-8' })
                if (child.stderr.trim()) {
                    throw new Error('Could not move src to ear', child.stderr.trim())
                }
            } else {
                throw new Error('src folder should exist in a java project')
            }
        }
    }

    __initializePipelineFolder() {
        const rsync = new Rsync()
            .source(`${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/.pipeline`)
            .destination(`${this.cwd}`)
            .set('a')
        rsync.execute(function(error) {
            if (error) {
                throw new Error(error)
            }
        })
        this.__customizeConfigJS()
    }

    __customizeConfigJS() {
        // Currently not implemented to detect if fork and get upstream url
        inquirer
            .prompt([
                {
                    type: 'input',
                    name: 'appName',
                    message: 'Enter the name of the application',
                },
                {
                    type: 'input',
                    name: 'ocpToolsNamespace',
                    message: 'Enter the openshift tools names for the application',
                },
                {
                    type: 'input',
                    name: 'ocpDevNamespace',
                    message: 'Enter the openshift dev names for the application',
                },
                {
                    type: 'input',
                    name: 'ocpTestNamespace',
                    message: 'Enter the openshift test names for the application',
                },
                {
                    type: 'input',
                    name: 'ocpProdNamespace',
                    message: 'Enter the openshift prod names for the application',
                },
            ])
            .then(answers => {})
        const gitUrl = spawnSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf-8' }).stdout.trim()
        console.log(gitUrl)
        let gitOwner
        if (gitUrl.startsWith('https://bwa.nrs.gov.bc.ca/int/stash')) {
            console.log('in if')
            gitOwner = gitUrl.split('/')[6]
        } else if (gitUrl.startsWith('git@github.com')) {
            gitOwner = gitUrl.split(':')[1].split('/')[0]
        } else {
            gitOwner = gitUrl.split('/')[4]
        }
    }

    __initializeOpenShiftFolder() {
        const doesOpenshiftExist = this.__isDir('../openshift')
        if (!doesOpenshiftExist) {
            // const cwd = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).stdout.trim()
            // console.log(cwd)
            const args = [
                '-r',
                `${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/openshift/`,
                `${this.cwd}/openshift`,
            ]
            spawnSync('cp', args, { encoding: 'utf-8' })
        }
    }

    initialize() {
        this.__earFolderShouldExist()
        this.__initializePipelineFolder()
        this.__initializeOpenShiftFolder()
    }
}
