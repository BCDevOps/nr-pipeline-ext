"use strict";
const expect = require("expect");
const {childProcess, writeToFile} = require('../lib/util-functions')
const path = require('path');
const fs = require('fs');
const lineByLine = require('n-readlines');

describe("childProcess:", function() {
   this.timeout(50000);
   context("Spawn bash command operations", function() {
      it("Can run 'ls' command", function() {
         return childProcess("ls")
         .then((result) => {
            expect(result.exitCode).toBe(0);
         });
      });

      it("With 'fake' command, it throws", async function() {
         return expect(childProcess("fakeCmd")).rejects.toThrow();
      });
   });
});

describe("writeToFile:", function() {
   this.timeout(50000);
   const testFilePath = path.join('/tmp', 'test.txt');
   const firstLine = "testing the first line";
   const liner = new lineByLine(testFilePath);

   it("Can write and append to file", function() {
      const secondLine = "testing the second line";
      const append = true;
      writeToFile(testFilePath, `${firstLine}\n`)
       .then(() => {
         return writeToFile(testFilePath, secondLine, append)
       })
       .then(() => {
         expect(liner.next().toString('ascii')).toBe(firstLine);
         expect(liner.next().toString('ascii')).toBe(secondLine);      
       })
   });

});
