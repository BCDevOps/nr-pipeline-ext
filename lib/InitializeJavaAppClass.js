'use strict'
const fs = require('fs')
// const { childProcess } = require('./util-functions')
const { spawnSync } = require('child_process')
const Rsync = require('rsync')
const inquirer = require('inquirer')
const replace = require('replace-in-file')

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
            console.log('------>  To ensure all repos are standardized, src folder moved to ear successfully')
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
        console.log('------>  .pipeline folder successfully initialized')
        this.__customizeConfigJS()
    }

    __customizeConfigJS() {
        // Currently not implemented to detect if fork and get upstream url
        inquirer
            .prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Enter the name of the application',
                },
                {
                    type: 'input',
                    name: 'build',
                    message: 'Enter the openshift tools namespace for the application',
                },
                {
                    type: 'input',
                    name: 'dev',
                    message: 'Enter the openshift dev namespace for the application',
                },
                {
                    type: 'input',
                    name: 'test',
                    message: 'Enter the openshift test namespace for the application',
                },
                {
                    type: 'input',
                    name: 'prod',
                    message: 'Enter the openshift prod namespace for the application',
                },
                {
                    type: 'input',
                    name: 'webappName',
                    message: 'Is the app public(yes/no)',
                },
            ])
            .then(answers => {
                const gitUrl = spawnSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf-8' }).stdout.trim()
                // console.log(gitUrl)
                for (const val in answers) {
                    if (val === 'dev') {
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "dlvr: ''",
                            `dlvr: '${answers[val]}'`
                        )
                    } else if (val === 'name') {
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "const name = ''",
                            `const name = '${answers[val]}'`
                        )
                    } else if (val === 'webappName') {
                        let newVal
                        if (answers[val] == 'yes') {
                            newVal = `pub#${answers.name}`
                        } else {
                            newVal = `${answers.name}`
                        }
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "const webappName = ''",
                            `const webappname = '${newVal}'`
                        )
                        continue
                    }
                    this.__replaceFileContent(
                        `${this.cwd}/.pipeline/lib/config.js`,
                        `${val}: ''`,
                        `${val}: '${answers[val]}'`
                    )
                }
                let gitOwner
                if (gitUrl.startsWith('https://bwa.nrs.gov.bc.ca/int/stash')) {
                    gitOwner = gitUrl.split('/')[6]
                } else if (gitUrl.startsWith('git@github.com')) {
                    gitOwner = gitUrl.split(':')[1].split('/')[0]
                } else {
                    gitOwner = gitUrl.split('/')[4]
                }
                this.__replaceFileContent(`${this.cwd}/.pipeline/lib/config.js`, "owner: ''", `owner: '${gitOwner}'`)
                const pomInfo = spawnSync('sed', ['-ne', '/modelVersion/,/<dependencies>/p', `${this.cwd}/pom.xml`], {
                    encoding: 'utf-8',
                })
                    .stdout.trim()
                    .split('\n')
                let artifactId = ''
                let packaging = ''
                let artifactVersion = ''
                for (let i = 0; i < pomInfo.length; i++) {
                    if (pomInfo[i].includes('artifactId')) {
                        artifactId = pomInfo[i].split('>')[1].split('<')[0]
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "const artifactId = ''",
                            `const artifactId = '${artifactId}'`
                        )
                    } else if (pomInfo[i].includes('packaging')) {
                        packaging = pomInfo[i].split('>')[1].split('<')[0]
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "const packagingType = ''",
                            `const packagingType = '${packaging}'`
                        )
                    } else if (pomInfo[i].includes('version')) {
                        artifactVersion = pomInfo[i].split('>')[1].split('<')[0]
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "const artifactVersion = ''",
                            `const artifactVersion = '${artifactVersion}'`
                        )
                    }
                }
            })
    }

    __replaceFileContent(file, fromString, toString) {
        const options = {
            files: file,
            from: fromString,
            to: toString,
        }
        replace.sync(options)
    }

    __initializeOpenShiftFolder() {
        const doesOpenshiftExist = this.__isDir(`${this.cwd}/openshift`)
        if (!doesOpenshiftExist) {
            // const cwd = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).stdout.trim()
            // console.log(cwd)
            const args = [
                '-r',
                `${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/openshift/`,
                `${this.cwd}/openshift`,
            ]
            spawnSync('cp', args, { encoding: 'utf-8' })
            console.log('------>  openshift folder successfully initialized')
        }
    }

    initialize() {
        this.__earFolderShouldExist()
        this.__initializePipelineFolder()
        this.__initializeOpenShiftFolder()
    }
}
