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
        if (!this.__isDir(`${this.cwd}/ear`)) {
            if (this.__isDir(`${this.cwd}/src`)) {
                fs.mkdirSync(`${this.cwd}/ear`)
                // const cwd = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).stdout.trim()
                // console.log(cwd)
                const args = [`${this.cwd}/src`, `${this.cwd}/ear`]
                const child = spawnSync('mv', args, { stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf-8' })
                const child2 = spawnSync('mv', [`${this.cwd}/pom.xml`, `${this.cwd}/ear`], {
                    stdio: ['inherit', 'inherit', 'pipe'],
                    encoding: 'utf-8',
                })
                if (child.stderr) {
                    process.exitCode = 1
                    throw new Error('Could not move src to ear', child.stderr.trim())
                }
                if (child2.stderr) {
                    process.exitCode = 1
                    throw new Error('Could not move pom.xml to ear', child.stderr.trim())
                }
            } else {
                process.exitCode = 1
                throw new Error('src folder should exist in a java project')
            }
            console.log('------>  To ensure all repos are standardized, src folder moved to ear successfully')
        } else {
            console.log('------>  ear exists and good to go!')
        }
    }

    async __initializePipelineFolder() {
        const rsync = new Rsync()
            .source(`${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/.pipeline`)
            .destination(`${this.cwd}`)
            .set('a')
        rsync.execute(function(error) {
            if (error) {
                process.exitCode = 1
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
                    message: 'Is the app public or internal(Enter "pub" for public and "int" for internal)',
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
                        let webapp
                        let routePath
                        if (answers[val] === 'pub') {
                            webapp = `pub#${answers.name}`
                            routePath = `pub/${answers.name}`
                        } else {
                            webapp = `int#${answers.name}`
                            routePath = `int/${answers.name}`
                        }
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "const webappName = ''",
                            `const webappName = '${webapp}'`
                        )
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "const routePath = ''",
                            `const routePath = '${routePath}'`
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
                let gitRepo
                if (gitUrl.startsWith('https://bwa.nrs.gov.bc.ca/int/stash')) {
                    gitOwner = gitUrl.split('/')[6]
                    gitRepo = gitUrl.split('/')[7].split('.')[0]
                } else if (gitUrl.startsWith('git@github.com')) {
                    gitOwner = gitUrl.split(':')[1].split('/')[0]
                    gitRepo = gitUrl
                        .split(':')[1]
                        .split('/')[1]
                        .split('.')[0]
                } else {
                    gitOwner = gitUrl.split('/')[4]
                    gitRepo = gitUrl.split('/')[5].split('.')[0]
                }
                this.__replaceFileContent(`${this.cwd}/.pipeline/lib/config.js`, "owner: ''", `owner: '${gitOwner}'`)
                this.__replaceFileContent(
                    `${this.cwd}/.pipeline/lib/config.js`,
                    "repository: ''",
                    `repository: '${gitRepo}'`
                )
                const pomInfo = spawnSync(
                    'sed',
                    ['-ne', '/modelVersion/,/<dependencies>/p', `${this.cwd}/ear/pom.xml`],
                    {
                        encoding: 'utf-8',
                    }
                )
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
                console.log('------>  config.js file successfully customized')
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
        if (!this.__isDir(`${this.cwd}/openshift`)) {
            // const cwd = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).stdout.trim()
            // console.log(cwd)
            const args = [
                '-r',
                `${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/openshift/`,
                `${this.cwd}/openshift`,
            ]
            const spawn = spawnSync('cp', args, { stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf-8' })
            if (spawn.stderr) {
                process.exitCode = 1
                throw new Error('Could not copy openshift templates', spawn.stderr.trim())
            }
            console.log('------>  openshift folder successfully initialized')
        }
    }

    __initializeJenkinsFile() {
        const args = [
            `${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/pipeline/Jenkinsfile`,
            `${this.cwd}/`,
        ]
        const spawn = spawnSync('cp', args, { stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf-8' })
        if (spawn.stderr) {
            process.exitCode = 1
            throw new Error('Could not copy Jenkinsfile', spawn.stderr.trim())
        }
        console.log('------>  Jenkinsfile successfully added')
    }

    __initializeNpmw() {
        const args = [`${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/npmw`, `${this.cwd}/`]
        const spawn = spawnSync('cp', args, { stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf-8' })
        if (spawn.stderr) {
            process.exitCode = 1
            throw new Error('Could not copy npmw', spawn.stderr.trim())
        }
        console.log('------>  NPM wrapper file was successfully added')
    }

    initialize() {
        this.__earFolderShouldExist()
        this.__initializeOpenShiftFolder()
        this.__initializeJenkinsFile()
        this.__initializeNpmw()
        this.__initializePipelineFolder()
    }
}
