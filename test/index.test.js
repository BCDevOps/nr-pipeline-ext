'use strict';
const expect = require('expect');

const {Jira} = require('../index.js')
const sinon = require('sinon');
const sandbox = sinon.createSandbox();


describe('index', function() {
  this.timeout(80000);

  afterEach(function () {
    // completely restore all fakes created through the sandbox
    sandbox.restore();
  });

  it('requires - Jira', function() {
      expect(Jira).toEqual(expect.anything())
  }) //end it
  it('Intantiate - Jira', async function() {
    const jira = new Jira({jira:{url: 'abc'}})

    var stub = sandbox.stub(jira, 'createJiraClient')
    stub.returns({
      issue: {
        getIssue: function(){
          return Promise.resolve({fields: {issuelinks: []}})
        },
        createIssue:function (){
          return Promise.resolve({key:'asdasda-2'})
        }
      },
      issueLink:{
        createIssueLink: function(){}
      }
    });

    var stub2 = sandbox.stub(jira, 'transition')
    stub2.returns(Promise.resolve(true))

    jira.createRFD()
  })
}) //end describe