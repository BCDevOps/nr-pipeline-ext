"use strict";
const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('request');

module.exports = class MavenRepository {
    constructor(url, credentials){
        this.url = url || 'https://bwa.nrs.gov.bc.ca/int/artifactory/libs-release/';
        this.credentials = credentials;
    }

    cache(gav){
        return new Promise((resolve, reject) => {
            //https://repo1.maven.org/maven2/org/liquibase/liquibase-core/3.5.3/liquibase-core-3.5.3.jar
            const remoteFileName = `${gav.groupId.replace(/\./gi,'/')}/${gav.artifactId}/${gav.version}/${gav.artifactId}-${gav.version}.${gav.ext || 'jar'}`
            const localFileName = path.join(path.join(path.join(os.tmpdir(), '.m2'), 'repository'), remoteFileName)
            
            if (fs.existsSync(localFileName)){
                resolve(localFileName)
            }else{
                fs.mkdirSync(path.dirname(localFileName), {recursive:true});
                const stream = fs.createWriteStream(localFileName);
                try{
                    const reqOptions = {encoding: null};
                    if (this.credentials != null){
                        Object.assign(reqOptions, {"auth": Object.assign({"sendImmediately": true}, this.credentials)})
                    }
                    const url = `${this.url}/${remoteFileName}`;
                    const req = request.get(url, reqOptions);

                    req.on('response', (response)=>{
                        if (response.statusCode >=200 && response.statusCode <=299){
                            req.pipe(stream);
                        }
                    });

                    req.on('complete', (response)=>{
                        stream.close()
                        if (response.statusCode >=200 && response.statusCode <=299){
                            resolve(localFileName)
                        }else{
                            fs.unlinkSync(localFileName)
                            reject(`Error downloading ${url}. Response status code is ${response.statusCode}`);
                        }
                    });

                    req.on('error', (err) => {
                        stream.close()
                        fs.unlinkSync(localFileName)
                        reject(err);
                    });
                }catch (err){
                    stream.close()
                    fs.unlinkSync(localFileName)
                    throw err;
                }
            }
        });
    }
}