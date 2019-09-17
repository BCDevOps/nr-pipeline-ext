"use strict";
const expect = require("expect");
const sinon = require("sinon");
const Gitop = require('../lib/GitOperation')
const idir = require("./idir.local.json");

describe("GitOperation:", function() {
   this.timeout(50000);
   // system test, requires credential from "./idir.local.json" (create one if not exists)
   context("prepare()", function() {
      it("When successfully prepared, repo directory is returned.", function() {
         // const gitCredentials = {username: 'fakeUsername', password: 'fakePass', email: 'fakeEmail'}
         const gitCredentials = {username: idir.user, password: idir.pass, email: 'fakeEmail'};
         const git = new Gitop('/Users/iliu/Workspace/labs/tempDir', 'https://bwa.nrs.gov.bc.ca/int/stash/scm/spi/spi-schema-da-review.git', gitCredentials, 'test');
         return git.prepare().then((result) => {
            expect(result).not.toBeNull();
         })
      })
   });
});

