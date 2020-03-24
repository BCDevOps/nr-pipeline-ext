/**
 * The class convert from ivy to pom for the project.
 * This only generate very simple maven pom file, but
 * is the start for the pom for further refinement.
 */
const fs = require('fs')
const path = require('path')
const replace = require('replace-in-file')
const { childProcess } = require('./util-functions')
const { logger } = require('./logger')

module.exports = class GenPom {
    constructor(settings) {
        this.settings = settings
    }

    run() {
        logger.info('Running GeneratePom with settings: %o', this.settings)
        const sourceBuildFilePath = this.settings.buildFilePath
        const destinationBuildFilePath = path.join(path.dirname(sourceBuildFilePath), 'buildTemp.xml')

        this._copyToTempBuildFile(sourceBuildFilePath, destinationBuildFilePath)

        const ivyFilePath = this.settings.ivyFilePath
        const targetPomPath = this.settings.targetPomPath
        this._appendIvyMakePom(destinationBuildFilePath, ivyFilePath, targetPomPath)

        // spawn to run "ant build -f <the build file>" to generate pom.xml"
        const buildDir = path.dirname(destinationBuildFilePath)
        childProcess('ant', ['build', '-f', destinationBuildFilePath], { cwd: buildDir })
            .then(result => {
                // logger.info(result.stdout)
                logger.info('Finished generating pom.xml')
                // move pom from default location to target location due to ivy is not able
                // to move to target location.
                const defaultPomPath = path.join(path.dirname(ivyFilePath), 'pom.xml')
                return fs.rename(defaultPomPath, targetPomPath, err => {
                    if (err) throw err
                })
            })
            .then(result => {
                logger.info(`Moved pom.xml to ${targetPomPath}`)
                fs.unlinkSync(destinationBuildFilePath)
                process.exit(0)
            })
            .catch(error => {
                logger.error('Error: Command execution failed: %o', error)
                fs.unlinkSync(destinationBuildFilePath)
                process.exit(1)
            })
    } // end run()

    _appendIvyMakePom(destinationBuildFilePath, ivyFilePath, targetPomPath) {
        const options = {
            files: destinationBuildFilePath,
            // Note: although specify 'pomfile' destination for ivy:makepom,
            // it does not take affect. It could be bug from ivy.
            // File pom.xml can be found at the same build.xml directory.
            from: '</project>',
            to: `   <target name="make-pom">
        <ivy:makepom ivyfile="${ivyFilePath}" pomfile="${targetPomPath}"/>
    </target>
</project>`,
        }
        try {
            // Replacig temporary buildTemp.xml with options.
            replace.sync(options)
        } catch (error) {
            logger.error(`Error occurred when replacing file: ${error}`)
        }
    } // end _appendIvyMakePom

    _copyToTempBuildFile(sourceBuildFilePath, destinationBuildFilePath) {
        try {
            logger.debug(`Temporarily copying ${sourceBuildFilePath}`)
            // can add thrid argument ,fs.constants.COPYFILE_EXCL, for file exist checking
            fs.copyFileSync(sourceBuildFilePath, destinationBuildFilePath)
        } catch (err) {
            logger.error(`Encountered eror during copying the source, \n${err}`)
            process.exit(1)
        }
    } // end _copyToTempBuildFile
}
