"use strict";
const expect = require("expect");
const sinon = require("sinon");
const sandbox = sinon.createSandbox();
const liquibase = require('../lib/liquibase')
const settings={ phases:
    { dev:
       { namespace: 'fake', phase: 'fake', dburl: 'jdbc:oracle:thin:@//test.bcgov:1521/test.nrs.bcgov' },
      },
   options:
    { git:
       { dir: './',
         branch: 'test',
         url:'test',
         uri: 'test',
         http_url: 'test',
         owner: 'test',
         repository: 'test',
         ref: 'refs/heads/test',
         branch_ref:'test' },
      cwd: './' },
   classpath: '../others/ojdbc8.jar',
   liquibasejar: '../liquibase-core-3.5.3.jar',
   stages:
    { backup:
       { stage: 'test',
         sql: '../BACKUP_AND_RECOVERY/sql/BACKUP.sql',
         changelog: '../BACKUP_AND_RECOVERY/changelog/BACKUP.xml',
         properties:
          '../BACKUP_AND_RECOVERY/changelog_properties/backup.propeties',
         ocSecret: 'backup-user' },
    }}

describe("liquibase module", function() {
   this.timeout(50000);
   context("On Liquibase setup", function() {
      it("install can be done", function(done) {
         const liquibaseObj = new liquibase(Object.assign(settings))
         liquibaseObj.install().then(dir=>{
            expect(dir).toBeDefined();
            done()
         })
      })
   });

});