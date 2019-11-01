const {spawn}  = require("child_process")
const settings = require(`${process.cwd()}/lib/config.js`);
(async () => {
    const username = settings.phases['build'].credentials.idir.user 
    const password = settings.phases['build'].credentials.idir.pass
    const url = settings.bitbucketUrl
    const pr = settings.options.pr
    const repoName = settings.options.repoName
    const projectName = settings.options.projectName
    const p1 = spawn('curl', ['-H', 'Content-type: application/json', '-u', `${username}:${password}`,'-X', 'GET', `${url}/rest/api/latest/projects/${projectName}/repos/${repoName}/pull-requests/${pr}/merge` ])
    let p2 = spawn('jq', ['.canMerge'], {stdio: [p1.stdout, 'pipe', process.error]})
    p2.stdout.on( 'data', data => {
        if(`${data}`){
            const p3 = spawn('curl', ['-H', 'Content-type: application/json', '-u', `${username}:${password}`,'-X', 'POST', `${url}/rest/api/latest/projects/${projectName}/repos/${repoName}/pull-requests/${pr}/merge?version` ])
            let p4 = spawn('jq', ['.errors[0].currentVersion'], {stdio: [p3.stdout, 'pipe', process.error]})
            p4.stdout.on('data', data =>{
                var version=data.slice(0, data.length - 1)
                const p5 = spawn('curl', ['-H', 'Content-type: application/json', '-u', `${username}:${password}`,'-X', 'POST', `${url}/rest/api/latest/projects/${projectName}/repos/${repoName}/pull-requests/${pr}/merge?version=${version}` ])
                p5.stdout.on('data', data => {
                   console.log("Pull Request", pr, "Merged Successfully" )
                })
                p5.stderr.on('data', data => {
                    console.log(`${data}`)
                })
            })
        }
        else {
            console.log("Cannot Merge Pull Request, Resolve Conflicts and Merge Manually")
        }
    });
    // -X GET ${BITBUCKET_URL}/rest/api/1.0/projects/${PROJECT_NAME}/repos/${REPO_NAME}/pull-requests/${PR_NO}/merge", returnStdout: true).trim()
    //VERSION=sh( script: "set +x && curl -H 'Content-type: application/json' -u ${USERNAME}:${PASSWORD} -X POST ${BITBUCKET_URL}/rest/api/1.0/projects/${PROJECT_NAME}/repos/${REPO_NAME}/pull-requests/${PR_NO}/merge?version | grep 'currentVersion' | cut -d ',' -f4 | cut -d ':' -f2",returnStdout: true).trim()
    //h "set +x && curl -H 'Content-type: application/json' -u ${USERNAME}:${PASSWORD} -X POST ${BITBUCKET_URL}/rest/api/1.0/projects/${PROJECT_NAME}/repos/${REPO_NAME}/pull-requests/${PR_NO}/merge?version=${VERSION}")
})();

/* withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'github-account', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD']]) {
    OP=sh(script: "set +x && curl -H 'Content-type: application/json' -u ${USERNAME}:${PASSWORD} -X GET ${BITBUCKET_URL}/rest/build-status/1.0/commits/${GIT_COMMIT}", returnStdout: true).trim()
    SIZE=sh(script: "set +x && echo ${OP}| cut -d ' ' -f1 | cut -d ':' -f2", returnStdout: true).trim()
    if ( SIZE == 1 ) {
    BUILD_KEY= sh(script: "set +x && echo ${OP} | cut -d ' ' -f5 | cut -d ':' -f3 | tr ']' ' '" ,returnStdout: true).trim()
     BUILD_NAME= sh(script: "set +x && echo ${OP} | cut -d '[' -f4 | cut -d ']' -f1 | cut -d ':' -f2" ,returnStdout: true).trim()
      sh "set +x && curl -H 'Content-type: application/json' -u ${USERNAME}:${PASSWORD} -X POST --data '{\"state\": \"SUCCESSFUL\", \"key\": \"${BUILD_KEY}\",\"name\": \"${BUILD_NAME}\",\"url\": \"${BUILD_URL}\"}' ${BITBUCKET_URL}/rest/build-status/1.0/commits/${GIT_COMMIT}"
    }
    else{
     OP=sh(script: "set +x && curl -H 'Content-type: application/json' -u ${USERNAME}:${PASSWORD} -X GET ${BITBUCKET_URL}/rest/build-status/1.0/commits/${GIT_COMMIT}", returnStdout: true).trim()
     BUILD_KEY1= sh(script: "set +x && echo ${OP} | cut -d ' ' -f5 | cut -d ':' -f3 | tr ']' ' '" ,returnStdout: true).trim()
     //BUILD_NAME1= sh(script: "echo ${OP} | cut -d '[' -f4 | cut -d ']' -f1 | cut -d ':' -f2 | cut -d ' ' -f1,2,3" ,returnStdout: true).trim()
     //echo "${BUILD_NAME1}"
     BUILD_KEY2= sh(script: "set +x && echo ${OP} | cut -d ' ' -f20 | cut -d ':' -f2 | cut -d ']' -f1" ,returnStdout: true).trim()
    // BUILD_NAME2= sh(script: "echo ${OP} | cut -d '[' -f7 | cut -d ':' -f5 | cut -d ']' -f1" ,returnStdout: true).trim()
    //echo "${BUILD_NAME2}"
    sh "set +x && curl -H 'Content-type: application/json' -u ${USERNAME}:${PASSWORD} -X POST --data '{\"state\": \"SUCCESSFUL\", \"key\": \"${BUILD_KEY1}\",\"url\": \"${BUILD_URL}\"}' ${BITBUCKET_URL}/rest/build-status/1.0/commits/${GIT_COMMIT}"
    sh "set +x && curl -H 'Content-type: application/json' -u ${USERNAME}:${PASSWORD} -X POST --data '{\"state\": \"SUCCESSFUL\", \"key\": \"${BUILD_KEY2}\",\"url\": \"${BUILD_URL}\"}' ${BITBUCKET_URL}/rest/build-status/1.0/commits/${GIT_COMMIT}" */