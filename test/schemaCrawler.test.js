"use strict";
const expect = require("expect");
const sinon = require("sinon");
const sandbox = sinon.createSandbox();
const {SchemaCrawler, SCHEMA_CRAWLER_VERSION} = require('../lib/SchemaCrawler')

describe("schemacrawler module", function() {
   this.timeout(50000);
   context("On Schemacrawler setup", function() {
      it("install can be done", function(done) {
         const schemaCrawler = new SchemaCrawler()
         schemaCrawler.install().then(dir=>{
            expect(dir).toBeDefined();
            done()
         })
      })
   });

   context("When checking installed version", function() {
      it("version: show correct download version", function(done) {
         const schemaCrawler = new SchemaCrawler()
         schemaCrawler.version().then(version=>{
            expect(version).toBe(SCHEMA_CRAWLER_VERSION.substring(1));
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