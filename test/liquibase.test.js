"use strict";
const expect = require("expect");
const liquibase = require('../lib/liquibase')

describe("liquibase module", function() {
   this.timeout(50000);
   context("On Liquibase setup", function() {
      it.only("install can be done", function() {
         const idir = require("./idir.local.json");
         const liquibaseObj = new liquibase({drivers:[{groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}], credentials: idir})

         return liquibaseObj.run(['--version']).then(proc=>{
            expect(proc.stdout.split('\n')[1]).toBe('Liquibase Version: 3.8.0');
         })
      })
   });

});