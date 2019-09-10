'use strict';

const {spawn}  = require("child_process")
const {SchemaCrawler} = require('nr-pipeline-ext')
const MavenRepository = require("./MavenRepository");

class ManageDaReview {
  constructor(settings) {
    this.settings;
  }

  _init() {
    const schemaCrawler = new SchemaCrawler(this.settings.dbUrl, this.settings.dbUser, this.settings.dbPassword);
    const schemaCrawlerHomeDirPromise = schemaCrawler.install(); 
    schemaCrawlerHomeDirPromise
      .then(this._downloadOtherDrivers)
      .then(this._exportPath)
      .catch((err) => { 
        console.error("Environment setup failed.", err);
        throw err;
      });
  }

  // {CWI_SPI_DC: "/tmp/CWI_SPI_DC.txt", CWI_TXN: "/tmp/CWI_TXN.txt"} 
  async doSchemaDetail(schemas, outputfile) {
    _init();

    const args = [`-url=${this.settings.dbUrl}`,
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
                  `-outputfile=${outputfile}`
                 ];

    let title = args.join(' ');
    args.push(title);
    const runResult = schemaCrawler.run(args);
    if (runResult.exitCode == -1) {
      throw new Error(`Failed on generating scheam ${schemas} 'details'`);
    }
    console.log(`Successfully on generating scheam ${schemas} 'details'`);
    return runResult;
  }

  async doSchemaLinting(schemas, outputfile) {
    _init();

    const args = [`-url=${this.settings.dbUrl}`,
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
                  `-outputfile=${outputfile}`
                  ];
                  
    let title = `LINT FOR DB CHANGE ON ${schemas}`;
    args.push(title);
    const runResult = schemaCrawler.run(args);
    if (runResult.exitCode == -1) {
      throw new Error(`Failed on generating scheam ${schemas} 'linting'`);
    }
    console.log(`Successfully on generating scheam ${schemas} 'linting'`);
    return runResult;
  }

  async _downloadOtherDrivers(schemaCrawlerHomeDir) {
    if(schemaCrawlerHomeDir == undefined) {
      throw new Error("SchemaCrawler did not setup properly.");
    }
    this.schemaCrawlerHomeDir = schemaCrawlerHomeDir;

    const idirCredentials = this.settings.credentials.idir
    const mavenRepository = new MavenRepository('https://bwa.nrs.gov.bc.ca/int/artifactory/libs-release', idirCredentials);
    const promises = []
    if (this.settings.drivers){
      for (let driver of this.settings.drivers){
        promises.push(mavenRepository.cache(driver))
      }
    }
    return Promise.all(promises).then((drivers) => {
      return {schemaCrawler: schemaCrawlerHomeDir, drivers:drivers};
    });
  }

  async _exportPath(filePaths) {
    // /tmp/schemacrawler-15.06.01
    // ./schemacrawler-15.06.01-distribution/_schemacrawler:./schemacrawler-15.06.01-distribution/_schemacrawler/lib
    const schemaCrawlerHomeDir = filePaths.schemaCrawlers;
    const drivers = filePaths.dirvers;
    let driverPaths = `PATH=$PATH:${schemaCrawlerHomeDir}/schemacrawler-15.06.01-distribution/_schemacrawler:${schemaCrawlerHomeDir}/schemacrawler-15.06.01-distribution/_schemacrawler/lib`;
    drivers.forEach(driverPath => {
      driverPaths = driverPaths + `:${driverPath}`;
    })

    const expt = spawn('export',[`PATH=$PATH:${driverPaths}`]);
    const rs = await _handleCProcess(expt);
    return rs;
  }

  async _handleCProcess(cp) {
    cp.on("error", (err) => {
      throw new Error(err);
    });
    cp.on("close", (code) => {
      if (code == 0) {
        return {status: true, data: code};
      }
      else {
        throw new Error("On close with non-zero exist code: ", code)
      }
    });
  }
}

module.exports = { ManageDaReview }

