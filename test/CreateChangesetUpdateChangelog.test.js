"use strict";
const expect = require('expect')
const moment = require('moment-timezone')
const Generator = require("../lib/CreateChangesetUpdateChangelog")
const generate=new Generator()

 describe("create Changeset", function() {
   this.timeout(50000);
   context("On running succesfully", function() {
      it.only("creates changeset", function() {
        var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
        var str="../migrations/testschema/sql/V"+tDate+"01__SAMPLE-123_create-table.sql"
         expect(generate.createChangeset("create-table","../migrations/testschema/sql","SAMPLE-123","01")).toBe(str)
         })
      })
   });

    describe("isDir", function() {
    this.timeout(50000);
    context("On running ", function() {
       it.only("returns true if directory exists, else false", function() {
          expect(generate.isDir('../migrations/testschema')).toBe(true)
          })
       })
    }); 
    describe("isDir", function() {
        this.timeout(50000);
        context("On running ", function() {
           it.only("returns dalse if directory doesnt exist", function() {
              expect(generate.isDir('../migrations/test')).toBe(false)
              })
           })
        }); 
 describe("update changelog", function() {
        this.timeout(50000);
        context("On running ", function() {
           it.only("updates a file", function() {
              expect(generate.updateChangelog('../migrations/testschema/changelog/testschema.xml',['create-table'],'test','99881891991')).toBe(true)
              })
           })
        }); 

describe("generate", function() {
        this.timeout(50000);
        context("On running ", function() {
            it.only("creates changeset and updates changelog", function() {
                expect(generate.execute('testschema','test','SAMPLE-123','create-table')).toBe(true)
                })
            })
        });  
