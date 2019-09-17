"use strict";
const expect = require("expect");
const sinon = require("sinon");
const ManageDaReview = require('../lib/manage-da-review')
const idir = require("./idir.local.json");
const db = require("./db.local.json");

// system test, requires credential from "./idir.local.json" and "./db.local.json" (create one if not exists)
describe("doSchemaDetail:", function() {
   this.timeout(50000);
   context("Using real correct settings", function() {
      const settings = {
               dbUrl: db.CWI_TXN.dbUrl,
               dbUser: db.CWI_TXN.dbUser,
               dbPassword: db.CWI_TXN.dbPassword,
               mavenCredentials: idir,
               drivers: [{groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}]
             }
      const manageDaReview = new ManageDaReview(settings);

      it("doSchemaDetail run CWI_SPI_DC detail successfully...", function() {
         return manageDaReview.doSchemaDetail("CWI_SPI_DC", "/tmp/CWI_SPI_DC.txt")
         .then((result) => {
            expect(result.exitCode).toBe(0);
            expect(result.stderr).toBe("");
         });
      })
   });
});

// system test, requires credential from "./idir.local.json" and "./db.local.json" (create one if not exists)
describe("doSchemaLinting:", function() {
   this.timeout(50000);
   context("Using real correct settings", function() {
      const settings = {
               dbUrl: db.CWI_TXN.dbUrl,
               dbUser: db.CWI_TXN.dbUser,
               dbPassword: db.CWI_TXN.dbPassword,
               mavenCredentials: idir,
               drivers: [{groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}]
             }
      const manageDaReview = new ManageDaReview(settings);

      it("doSchemaLinting run CWI_SPI_DC linting successfully...", function() {
         return manageDaReview.doSchemaLinting("CWI_SPI_DC", "/tmp/CWI_SPI_DC_Lint.txt")
         .then((result) => {
            expect(result.exitCode).toBe(0);
            expect(result.stderr).toBe("");
         });
      })
   });
}); 

