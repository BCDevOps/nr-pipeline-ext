const Jira = require('./jira');
const config = require(`${process.cwd()}/lib/config.js`)
const env = config.options.env

// Jira settings
const jiraUrl = config.jiraUrl
const username = config.phases[env].credentials.idir.user 
const password = config.phases[env].credentials.idir.pass 
const changeBranch = config.options.git.branch.merge
const branchName = "PR-"+config.options.pr
const gitUrl = config.options.git.url

const elements = gitUrl.split('/')

const projectName = elements[6].toUpperCase()
const repoName = elements[7].split('.')[0]
const key= changeBranch.split('-')
const rfcIssueKey = key[0]+'-'+key[1]


const jiraSettings= { url: jiraUrl, username: username, password: password, rfcIssueKey:rfcIssueKey, changeBranch:changeBranch, branchName:branchName, repoName: repoName, projectName: projectName}

// Create the jira object of the type Jira 
const jira = new Jira(Object.assign({ phase: 'jira-update', jira: jiraSettings}))
jira.createRFD()