"use strict";
const expect = require("expect");
const Verifier = require('../lib/InputDeployerVerify.js');



describe("verify module", function() {
   context("On verification", function() {
      it("returns ready or not ready", function(done) {
         const idir = require("./idir.local.json");
         const verify = new Verifier(`credentials: ${idir}`);
         console.log(verify.verifyBeforeDeployment())
         verify.verifyBeforeDeployment().then(value=>{
            expect(value).toBe("READY");
            done()
         })
      })
   });

});