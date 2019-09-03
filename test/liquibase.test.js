"use strict";
const expect = require("expect");
const liquibase = require('../lib/liquibase')

describe("liquibase module", function() {
   this.timeout(50000);
   context("On Liquibase setup", function() {
      it("install can be done", function(done) {
         const idir = require("./idir.local.json");
         const liquibaseObj = new liquibase({drivers:[{groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}], credentials: idir})
         liquibaseObj.install().then(spec=>{
            expect(spec).toBeDefined();
            expect(spec.liquibase).toBeDefined();
            expect(spec.drivers).toBeDefined();
            expect(spec.drivers.length).toBe(1)
            done()
         })
      })
   });

});