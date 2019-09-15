'use strict';
const {SchemaCrawler} = require('./SchemaCrawler')
const {childProcess} = require('./util-functions')
const fs = require("fs")
const del = require('del');

module.exports = class ManageDaReview {
  constructor(settings) {
    this.settings = settings;
  }

  async doSchemaDetail(schemas, outputfile) {
    const schemaCrawler = new SchemaCrawler(this.settings.dbUrl, this.settings.dbUser, 
                                            this.settings.dbPassword, this.settings.drivers, 
                                            this.settings.mavenCredentials);
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
    args.push(`-title='${title}'`);
    const runResult = await schemaCrawler.run(args);
    console.log(`Successfully on generating scheam ${schemas} 'details'`);
    return Promise.resolve(runResult);
  }

  async doSchemaLinting(schemas, outputfile) {
    const schemaCrawler = new SchemaCrawler(this.settings.dbUrl, this.settings.dbUser, 
                                            this.settings.dbPassword, this.settings.drivers, 
                                            this.settings.mavenCredentials);

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
    args.push(`-title='${title}'`);
    const runResult = await schemaCrawler.run(args);
    console.log(`Successfully on generating scheam ${schemas} 'linting'`);
    return Promise.resolve(runResult);
  }

  async cloneAndPushNewReviewInfo(baseDir, daReviewGitRepoUrl, gitCredentials, changeBranch, outputfiles) {
    // check or create the working directory
    if (!fs.existsSync(baseDir)){
      console.log("make DA-Review working directory")
      fs.mkdirSync(baseDir);
    }
    else {
      // remove all content
      const deletedPaths = await del(path.posix.join(baseDir, '**'));
    }

    // config git credentials
    const globalGitconfigFilePath = path.join(baseDir, '.gitcredentials');
    var exp = daReviewGitRepoUrl.split(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);
    const protocol = exp[2];
    const host = exp[4];
    const globalGitconfigFileStream = fs.createWriteStream(globalGitconfigFilePath);
    globalGitconfigFileStream.write(`protocol=${protocol}\n`);
    globalGitconfigFileStream.write(`host=${host}\n`);
    globalGitconfigFileStream.write(`username=${gitCredentials.username}\n`);
    globalGitconfigFileStream.write(`password=${gitCredentials.password}\n`);
    globalGitconfigFileStream.write(`user.name=${gitCredentials.username}\n`);
    globalGitconfigFileStream.write(`user.email=${gitCredentials.email}\n`);
    globalGitconfigFileStream.close();

    childProcess('git',['config', '--global', 'credential.helper', "'store --file ~/.git-credentials'"])
      .then(() => childProcess('git',['credential-store', '--file', '~/.git-credentials', 'store', '<', '.gitcredentials']))
      .then(() => childProcess('git',['clone', daReviewGitRepoUrl, baseDir]))
      .then(() => childProcess('git',['branch', changeBranch]))
      .then(() => childProcess('git',['checkout', changeBranch]))
      .then(() => {
        return repoDir = fs.readdirSync(baseDir)[0];
      })
      .then((repoDir) => childProcess('cd',[repoDir]))
      .then(async () => {
        for (let outputFile of outputfiles) {
          await childProcess('mv',[outputFile, '.'])
        }
      })
      .then(() => childProcess('git',['add', '.']))
      .then(() => childProcess('git',['commit', '-m', "'New Scheam detail/linting information'"]))
      .then(() => childProcess('git',['pull', 'origin', changeBranch, '--rebase']))
      .then(() => childProcess('git',['push', '--set-upstream', daReviewGitRepoUrl, changeBranch]))
      .catch((err) => {
        throw new Error(err)
      })
  }

}


