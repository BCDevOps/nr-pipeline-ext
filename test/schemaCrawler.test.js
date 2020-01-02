"use strict";
const expect = require("expect");
const sinon = require("sinon");
const {SchemaCrawler, SCHEMA_CRAWLER_VERSION} = require('../lib/SchemaCrawler')
const MavenRepository = require('../lib/MavenRepository')

const fakeConfig = {url: "fakeUrl", user: "fakeUser", password: "fakePassword"}

describe.only("schemacrawler module", function() {
   this.timeout(50000);
   context("On Schemacrawler setup", function() {
      it("install without ojdbc", function() {
         const schemaCrawler = new SchemaCrawler(fakeConfig.url, fakeConfig.user, fakeConfig.password);
         return schemaCrawler.install().then(dir=>{
            expect(dir).toBeDefined();
         })
      });
      it("install with ojdbc", function() {
         const idir = require("./idir.local.json");
         const schemaCrawler = new SchemaCrawler(fakeConfig.url, fakeConfig.user, fakeConfig.password, [{groupId:'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}], idir);
         return new MavenRepository('https://repo1.maven.org/maven2').clear().then(()=>{
            return schemaCrawler.install().then(dir=>{
               expect(dir).toBeDefined();
            })
         })
      })
   });