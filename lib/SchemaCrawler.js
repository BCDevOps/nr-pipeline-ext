'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const MavenRepository = require('./MavenRepository')

const SCHEMA_CRAWLER_VERSION = 'v15.06.01' // current version used.

/**
 * SchemaCrawler node module.
 * Intallation for current version as in SCHEMA_CRAWLER_VERSION if the environment does not have the version installed in
 * /tmp/schemacrawler-15.06.01 directory.
 *
 * Use: "new SchemaCrawler(url, user, password);", then use 'run' or 'runCommand' to pass arguments to create report from
 * Schemacrawler.
 */
class SchemaCrawler {
  constructor (url, user, password, jdbcDrivers, mavenCredentails) {
    this.schemaCrawlerZipFile = '/tmp/schemacrawler-15.06.01-distribution.zip'
    this.shemaCrawlerHomeDir = '/tmp/schemacrawler-15.06.01'
    this.schemaCrawlerDownloadSite = 'https://github.com/schemacrawler/SchemaCrawler/releases/download/v15.06.01/schemacrawler-15.06.01-distribution.zip'
    this.config = [`-password=${password}`, `-user=${user}`, `-url=${url}`]
    this.jdbcDrivers = jdbcDrivers
    this.mavenCredentials = mavenCredentails
  }

  downloadDrivers () {
    const drivers = []
    if (this.jdbcDrivers) {
      const mavenRepository = new MavenRepository('https://bwa.nrs.gov.bc.ca/int/artifactory/libs-release', this.mavenCredentials)
      for (const jdbcDriverGAV of this.jdbcDrivers) {
        drivers.push(mavenRepository.cache(jdbcDriverGAV))
      }
    }
    return Promise.all(drivers)
  }

  /**
    * This install SchemaCrawler if it does not exist initially.
    * The current version it installs for SchemaCrawler is v15.06.01.
    * The installation will be under "/tmp/schemacrawler-15.06.01"
    */
  install () {
    const self = this
    return Promise.resolve(self.schemaCrawlerZipFile)
      .then((fileName) => {
        return new Promise(resolve => {
          // if file exists
          fs.stat(fileName, function (err, stats) {
            resolve({ fileName, exists: (!err) })
          })
        })
      }).then((file) => {
        if (file.exists === true) {
          return file
        } else {
          // download if not exist
          return new Promise(resolve => {
            spawn('curl', ['-sSL', '-o', file.fileName, self.schemaCrawlerDownloadSite])
              .on('close', function (code, signal) {
                resolve(file)
              })
          })
        }
      }).then((file) => {
        return new Promise(resolve => {
          // setting up home directory for unzip
          if (!fs.existsSync(self.shemaCrawlerHomeDir)) {
            console.log('make home directory')
            fs.mkdirSync(self.shemaCrawlerHomeDir)
          }
          const proc = spawn('unzip', ['-q', '-n', file.fileName, '-d', self.shemaCrawlerHomeDir])

          proc.on('exit', (exitCode) => {
            console.log('exit')
            resolve(self.shemaCrawlerHomeDir)
          })
        })
      }).then((homeDir) => {
        return this.downloadDrivers().then(() => { return `${homeDir}/schemacrawler-15.06.01-distribution/_schemacrawler` })
      })
  }

  /**
    * Returning current installed version of SchemaCrawler
    */
  version () {
    return this.run(['-version'])
      .then((proc) => {
        const lines = proc.stdout.split(/\r?\n/)
        return lines[0].substring('SchemaCrawler '.length)
      })
  }

  /**
    * Run SchemaCrawler with optional arguments. The config/credentials init from constructor.
    * @param {Array} args as string array; i.e ['-lh', '/usr']
    */
  run (args) {
    // added config/credentials
    if (this.config) {
      this.config.forEach(c => args.unshift(c))
    }

    return this.install()
      .then((homeDir) => {
        return this.downloadDrivers().then((drivers) => {
          return new Promise((resolve, reject) => {
            args.unshift('-cp', `lib/*:${drivers.join(':')}:lib/config`, 'schemacrawler.Main')
            console.log(`homeDir=${homeDir}`)
            // do not leave below line uncommentted, contain credential. Only for debugging.
            // console.log(args.join(' '))

            const proc = spawn('java', args, { cwd: homeDir })

            proc.on('exit', (exitCode) => {
              if (stderr) {
                // note: SchemaCrawler has a bug that when failed, in some scenario, it does not return non-zero exit code.
                reject(new Error(stderr))
              } else {
                resolve({ stdout, stderr, exitCode })
              }
            })

            let stdout = ''
            let stderr = ''
            proc.stderr.on('data', (data) => {
              stderr += data
            })
            proc.stdout.on('data', (data) => {
              stdout += data
            })
          })
        })
      })
  }
} // End SchemaCrawler Class

module.exports = { SchemaCrawler, SCHEMA_CRAWLER_VERSION }
