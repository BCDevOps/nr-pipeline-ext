"use strict";
const expect = require("expect");
const Verifier = require('../lib/InputDeployerVerify.js');
const idir = require('./idir.local.json')

var config = {
  phases:{
   dlvr: {
      credentials:{
         idir

      }
   }
  },
  options:
   { git:
      { dir: '/Users/posivana/work/TeamZero/Application/wiof',
        branch: {
           name:'WIOF-172-update-tomcat-and-make-objects-serializable',
           merge: 'WIOF-172-update-tomcat-and-make-objects-serializable'
        },
        url:
         'https://bwa.nrs.gov.bc.ca/int/stash/scm/wiof/wiof-wiof-ear.git',
        uri:
         'https://bwa.nrs.gov.bc.ca/int/stash/scm/wiof/wiof-wiof-ear.git',
        http_url:
         'https://bwa.nrs.gov.bc.ca/int/stash/scm/wiof/wiof-wiof-ear.git',
        owner: 'WIOF',
        repository: 'wiof-wiof-ear',
        ref:
         'refs/heads/WIOF-172-update-tomcat-and-make-objects-serializable',
        branch_ref:
         'refs/heads/WIOF-172-update-tomcat-and-make-objects-serializable' },
     cwd: '/Users/posivana/work/TeamZero/Application/wiof',
     env: 'dlvr',
   },
  jiraUrl: 'bwa.nrs.gov.bc.ca/int/jira',
  bitbucketUrl: 'https://bwa.nrs.gov.bc.ca/int/stash' }

describe("verify module", function() {
   this.timeout(50000);
   context("On verification", function() {
      it.only("return ready or not ready", function() {
         //const idir = require("./idir.local.json");
         const verifyObj = new Verifier(Object.assign(config))

          return verifyObj.verifyBeforeDeployment().then(status=>{
            console.log(status)
            expect(status).toContain("Ready")
         }) 
      })
   });

});