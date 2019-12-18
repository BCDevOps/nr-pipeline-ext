"use strict";
const expect = require('expect')
var generate = require("../lib/createChangesetUpdateChangelog")

 describe("create Changeset", function() {
   this.timeout(50000);
   context("On running ", function() {
      it.only("creates changeset", function() {
         expect(generate.createChangeset("create-table","./test/migrations/testschema/sql","SAMPLE-123","01")).toContain('01__SAMPLE-123_create-table.sql')
         })
      })
   });
    describe("isDir", function() {
    this.timeout(50000);
    context("On running ", function() {
       it.only("returns true if directory exists, else false", function() {
          expect(generate.isDir('./test/migrations/testschema')).toBe(true)
          })
       })
    }); 
    describe("update changelog", function() {
        this.timeout(50000);
        context("On running ", function() {
           it.only("updates a file", function() {
              expect(generate.updateChangelog('./test/migrations/testschema/changelog/testschema.xml',['create-table'],'test','99881891991')).toBeTruthy
              })
           })
        }); 