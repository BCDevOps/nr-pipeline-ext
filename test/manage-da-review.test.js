"use strict";
const expect = require("expect");
const sinon = require("sinon");
const ManageDaReview = require('../lib/manage-da-review')
const idir = require("./idir.local.json");

describe("doSchemaDetail:", function() {
   this.timeout(50000);
   context("Using real correct settings", function() {
      const settings = {
               dbUrl: "jdbc:oracle:thin:@//nrc1db01.bcgov:1521/LBTESTDB.nrs.bcgov",
               dbUser: "CWI_TXN",
               dbPassword: "cwi_txn",
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

describe("doSchemaLinting:", function() {
   this.timeout(50000);
   context("Using real correct settings", function() {
      const settings = {
               dbUrl: "jdbc:oracle:thin:@//nrc1db01.bcgov:1521/LBTESTDB.nrs.bcgov",
               dbUser: "CWI_TXN",
               dbPassword: "cwi_txn",
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
