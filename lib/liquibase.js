
'use strict';
const liquibaseClient = require('liquibase');
 // Use npm module jira-connector
class Liquibase {   
    constructor(settings) {
        this.settings = settings
    
      }
        // class defintion for the class jira
  async migrate(defaultsFile, liquibaseJar, ojdbcJar, url, username, password){ 
   await liquibaseClient({
    defaultsFile: defaultsFile,
    liquibase: liquibaseJar,
    driver: 'oracle.jdbc.OracleDriver',
    classpath: ojdbcJar,
    url: url,
    username: username,
    password: password
})
.run('migrate')
.then(() => console.log('Liquibase Migration Succeeded'))
.catch((err) => console.log('fail', err));
}
}
module.exports = Liquibase