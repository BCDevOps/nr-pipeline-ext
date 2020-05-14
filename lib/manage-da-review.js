'use strict'
const { SchemaCrawler } = require('./SchemaCrawler')
const { childProcess } = require('./util-functions')
const GitOp = require('./GitOperation')

/**
 * The class contains the logic or functions that current Data Architects might be
 * interested to use when there is a change to the database, such as schema discovery
 * and schema linting.
 * It also contains function to push outputfile to repo.
 * Subclass this if needed when requirements changes.
 */
module.exports = class ManageDaReview {
    constructor(settings) {
        this.settings = settings
    }

    /**
     * Do schema discovery using default program 'SchemaCrawler'.
     * The arguments to SchemaCrawler are currently pre-set and does not expose to change.
     * @param {*} schemas on which to create the detail from SchemaCrawler.
     * @param {*} outputfile the output file path for generated file.
     */
    async doSchemaDetail(schemas, outputfile) {
        const schemaCrawler = new SchemaCrawler(
            this.settings.dbUrl,
            this.settings.dbUser,
            this.settings.dbPassword,
            this.settings.drivers,
            this.settings.mavenCredentials
        )
        const args = [
            `-url=${this.settings.dbUrl}`,
            `-user=${this.settings.dbUser}`,
            `-user=${this.settings.dbPassword}`,
            '-command=details',
            '-infolevel=detailed',
            '-portablenames=true',
            '-fmt=text',
            '-sortcolumns=true',
            '-sorttables=true',
            '-driver=oracle.jdbc.driver.OracleDriver',
            `-schemas=${schemas}`,
            `-outputfile=${outputfile}`,
        ]

        const title = args.join(' ')
        args.push(`-title='${title}'`)
        const runResult = await schemaCrawler.run(args)
        console.log(`Successfully on generating scheam ${schemas} 'details'`)
        return Promise.resolve(runResult)
    }

    /**
     * Do schema linting using default program 'SchemaCrawler'.
     * The arguments to SchemaCrawler are currently pre-set and does not expose to change.
     * @param {*} schemas on which to create the linting from SchemaCrawler.
     * @param {*} outputfile the output file path for generated file.
     */
    async doSchemaLinting(schemas, outputfile) {
        const schemaCrawler = new SchemaCrawler(
            this.settings.dbUrl,
            this.settings.dbUser,
            this.settings.dbPassword,
            this.settings.drivers,
            this.settings.mavenCredentials
        )

        const args = [
            `-url=${this.settings.dbUrl}`,
            `-user=${this.settings.dbUser}`,
            `-user=${this.settings.dbPassword}`,
            '-command=lint',
            '-infolevel=detailed',
            '-portablenames=true',
            '-fmt=text',
            '-text',
            '-sortcolumns=true',
            '-sorttables=true',
            '-driver=oracle.jdbc.driver.OracleDriver',
            `-schemas=${schemas}`,
            `-outputfile=${outputfile}`,
        ]

        const title = `LINT FOR DB CHANGE ON ${schemas}`
        args.push(`-title='${title}'`)
        const runResult = await schemaCrawler.run(args)
        console.log(`Successfully on generating scheam ${schemas} 'linting'`)
        return Promise.resolve(runResult)
    }

    cloneAndPushNewReviewInfo(baseDir, daReviewGitRepoUrl, gitCredentials, changeBranch, outputfiles) {
        // config git credentials
        const gitOp = new GitOp(baseDir, daReviewGitRepoUrl, gitCredentials, changeBranch)
        return gitOp
            .prepare()
            .then(baseDir => {
                const mvfiles = []
                for (const outputFile of outputfiles) {
                    mvfiles.push(childProcess('cp', [outputFile, baseDir], { cwd: baseDir }))
                }
                return Promise.all(mvfiles)
            })
            .then(() => childProcess('git', ['add', '.'], { cwd: baseDir }))
            .then(() =>
                childProcess('git', ['commit', '-m', "'New Scheam detail/linting information'"], { cwd: baseDir })
            )
            .then(() => childProcess('git', ['pull', 'origin', changeBranch, '--rebase'], { cwd: baseDir }))
            .then(() =>
                childProcess('git', ['push', '--set-upstream', daReviewGitRepoUrl, changeBranch], { cwd: baseDir })
            )
            .then(() => Promise.resolve(true))
            .catch(err => {
                throw new Error(err)
            })
    } // end cloneAndPushNewReviewInfo()
}
