const { spawn } = require('child_process')
const settings = require(`${process.cwd()}/config/index.js`)
const Verifier = require('./InputMergePR')
;(async () => {
    const verify = new Verifier(Object.assign(settings))
    const verifyStatus = await verify.verifyBeforeDeployment()
    console.log(verifyStatus)
    if (verifyStatus === 'Ready') {
        const username = settings.phases.build.credentials.idir.user
        const password = settings.phases.build.credentials.idir.pass
        const url = settings.bitbucketUrl
        const pr = settings.options.pr
        const repoName = settings.options.repoName
        const projectName = settings.options.projectName
        const p1 = spawn('curl', [
            '-H',
            'Content-type: application/json',
            '-u',
            `${username}:${password}`,
            '-X',
            'GET',
            `${url}/rest/api/latest/projects/${projectName}/repos/${repoName}/pull-requests/${pr}/merge`,
        ])
        const p2 = spawn('jq', ['.canMerge'], { stdio: [p1.stdout, 'pipe', process.error] })
        p2.stdout.on('data', data => {
            if (`${data}`) {
                const p3 = spawn('curl', [
                    '-H',
                    'Content-type: application/json',
                    '-u',
                    `${username}:${password}`,
                    '-X',
                    'POST',
                    `${url}/rest/api/latest/projects/${projectName}/repos/${repoName}/pull-requests/${pr}/merge?version`,
                ])
                const p4 = spawn('jq', ['.errors[0].currentVersion'], { stdio: [p3.stdout, 'pipe', process.error] })
                p4.stdout.on('data', data => {
                    const version = data.slice(0, data.length - 1)
                    const p5 = spawn('curl', [
                        '-H',
                        'Content-type: application/json',
                        '-u',
                        `${username}:${password}`,
                        '-X',
                        'POST',
                        `${url}/rest/api/latest/projects/${projectName}/repos/${repoName}/pull-requests/${pr}/merge?version=${version}`,
                    ])
                    p5.stdout.on('data', data => {
                        console.log('Pull Request', pr, 'Merged Successfully')
                    })
                    p5.stderr.on('data', data => {
                        console.log(`${data}`)
                    })
                })
            } else {
                console.log('Cannot Merge Pull Request, Resolve Conflicts and Merge Manually')
            }
        })
    }
})()
