"use strict";
const expect = require("expect");
const {childProcess} = require('../lib/util-functions')

describe("childProcess:", function() {
   this.timeout(50000);
   context("Spawn bash command operations", function() {
      it("Can run 'ls' command", function() {
         return childProcess("ls")
         .then((result) => {
            expect(result).toBe(0);
         });
      });

      it("With 'fake' command, it throws", async function() {
         return expect(childProcess("fakeCmd")).rejects.toThrow();
      });
   });
});   
