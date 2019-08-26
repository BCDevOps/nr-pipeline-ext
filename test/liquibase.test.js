"use strict";
const expect = require("expect");
const sinon = require("sinon");
const sandbox = sinon.createSandbox();
const {liquibase, liquibase_version} = require('../lib/liquibase')

describe("liquibase module", function() {
   this.timeout(50000);
   context("On Liquibase setup", function() {
      it("install can be done", function(done) {
         const liquibase = new Liquibase()
         liquibase.install().then(dir=>{
            expect(dir).toBeDefined();
            done()
         })
      })
   });

   context("When checking installed version", function() {
      it("version: show correct download version", function(done) {
         const liquibase = new Liquibase()
         Liquibase.version().then(version=>{
            expect(version).toBe(liquibase_version.substring(1));
            done()
         })
      });
   });

   context("Running SchemaCrawler command", function() {
      it("runCommand: SchemaCrawler -h command executed successfully. ", function(done) {
         const schemaCrawler = new SchemaCrawler();
         schemaCrawler.runCommand({"-h": ""}).then(output => {
            expect(output.exitCode).toBe(0)
            done();
         })
      });
   });

});