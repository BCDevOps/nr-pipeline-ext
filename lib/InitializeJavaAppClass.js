'use strict'
const fs = require('fs')
// const { childProcess } = require('./util-functions')
const { spawnSync } = require('child_process')
const Rsync = require('rsync')
const inquirer = require('inquirer')
const replace = require('replace-in-file')
const { childProcess } = require('./util-functions')
const { logger } = require('./logger')

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
                // logger.info(cwd)
                const args = [`${this.cwd}/src`, `${this.cwd}/ear`]
                childProcess('mv', args, { encoding: 'utf-8' })
                    .then(res => {
                        return childProcess('mv', [`${this.cwd}/pom.xml`, `${this.cwd}/ear`], {
                            stdio: ['inherit', 'inherit', 'pipe'],
                            encoding: 'utf-8',
                        })
                            .then(() =>
                                logger.info(
                                    '------>  To ensure all repos are standardized, src folder moved to ear successfully'
                                )
                            )
                            .catch(err => {
                                logger.error('Could not move pom.xml to ear: %o', err)
                                process.exit(1)
                            })
                    })
                    .catch(err => {
                        logger.error('Could not move src to ear: %o', err)
                        process.exit(1)
                    })
            } else {
                logger.error('src folder should exist in a java project')
                process.exit(1)
            }
        } else {
            logger.info('------>  ear exists and good to go!')
        }
    }

    async __initializePipelineFolder() {
        // const self = this
        const rsync = new Rsync()
            .source(`${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/.pipeline`)
            .destination(`${this.cwd}`)
            .set('a')
        rsync.execute(function(error) {
            if (error) {
                logger.error(error)
                process.exit(1)
            }
            logger.info('------>  .pipeline folder successfully initialized')
            self.__customizeConfigJS()
        })
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
                // logger.info(gitUrl)
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
                            "WEBAPP_NAME: ''",
                            `WEBAPP_NAME: '${webapp}'`
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
                            "ARTIFACT_ID: ''",
                            `ARTIFACT_ID: '${artifactId}'`
                        )
                    } else if (pomInfo[i].includes('packaging')) {
                        packaging = pomInfo[i].split('>')[1].split('<')[0]
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "PACKAGING_TYPE: ''",
                            `PACKAGING_TYPE: '${packaging}'`
                        )
                    } else if (pomInfo[i].includes('version')) {
                        artifactVersion = pomInfo[i].split('>')[1].split('<')[0]
                        this.__replaceFileContent(
                            `${this.cwd}/.pipeline/lib/config.js`,
                            "ARTIFACT_VERSION: ''",
                            `ARTIFACT_VERSION: '${artifactVersion}'`
                        )
                    }
                }
                logger.info('------>  config.js file successfully customized')
            })
            .catch(err => {
                logger.error('The error occured while customize config JS: %o', err)
                process.exit(1)
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
            // logger.info(cwd)
            const args = [
                '-r',
                `${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/openshift/`,
                `${this.cwd}/openshift`,
            ]
            childProcess('cp', args, { encoding: 'utf-8' })
                .then(() => logger.info('------>  openshift folder successfully initialized'))
                .catch(err => {
                    logger.error('Could not copy openshift templates: %o', err)
                    process.exit(1)
                })
        }
    }

    __initializeJenkinsFile() {
        const args = [
            `${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/pipeline/Jenkinsfile`,
            `${this.cwd}/`,
        ]
        childProcess('cp', args, { encoding: 'utf-8' })
            .then(() => logger.info('------>  Jenkinsfile successfully added'))
            .catch(err => {
                logger.error('Could not copy Jenkinsfile: %o', err)
                process.exit(1)
            })
    }

    __initializeNpmw() {
        const args = [`${this.cwd}/.pipeline/node_modules/nr-pipeline-ext/lib/templates/npmw`, `${this.cwd}/`]
        childProcess('cp', args, { encoding: 'utf-8' })
            .then(() => logger.info('------>  NPM wrapper file was successfully added'))
            .catch(err => {
                logger.error('Could not copy npmw: %o', err)
                process.exit(1)
            })
    }

    initialize() {
        this.__earFolderShouldExist()
        this.__initializeOpenShiftFolder()
        this.__initializeJenkinsFile()
        this.__initializeNpmw()
        this.__initializePipelineFolder()
    }
}
