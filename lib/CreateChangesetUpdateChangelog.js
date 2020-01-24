var fs = require('fs'); 
var moment = require('moment-timezone')
const replace = require('replace-in-file');

module.exports = class {
    constructor() {
    }
   createChangeset(typeOfMigration,dbChange,changesetPath,version){ 
        if(typeOfMigration.toLowerCase()=='versioned'){       
            var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
            var newFileName=changesetPath+'/'+'V'+tDate+version+'__'+'_'+dbChange +'.sql'
            fs.open(newFileName, 'w', function(err,file){
                if(err) throw err;
                }); 
            return newFileName
        }
        else if(typeOfMigration.toLowerCase()=='repeatable'){
            var newFileName=changesetPath+'/'+'R'+'__'+dbChange+'.sql'
            fs.open(newFileName, 'w', function(err,file){
                if(err) throw err;
                }); 
            return newFileName
        }
        else{
            throw new Error("Invalid Migration Type");
        }
    }

    isDir(path) {
        try {
            var stat = fs.lstatSync(path);
            return stat.isDirectory();
        }catch (err) {
            // lstatSync throws an error if path doesn't exist
            return false;
        }
    }

    updateChangelog(typeOfMigration,changelogPath,changeset,username,id){
        const options = {
            files: changelogPath,
            from: "</databaseChangeLog>",
            to: ' ',
        };
        replace.sync(options)
        var contents=fs.readFileSync(changelogPath, 'utf8')
        if(contents.includes(`id=\"${id}\"`)){
            throw new Error("This id already exists, meaning there is a changeset created for this object, modify the same file and make sure it is Repeatable Migration in the changelog file");
        }
        else {
        if(typeOfMigration.toLowerCase()=='versioned') {
          var startText= "<changeSet author=\"" + username + "\" id=\"" + id + "\">" + '\n' 
        }
        else if(typeOfMigration.toLowerCase()=='repeatable'){
          var startText= "<changeSet author=\"" + username + "\" id=\"" + id + "\" runOnChange=\"true" +"\">" + '\n' 
        }
        fs.appendFileSync(changelogPath, startText, function(err) {
            if(err) {
                throw new Error("File Cannot be Appended")
            }
        });
            var text="\t<sqlFile path=\""+changeset +"\" relativeToChangelogFile=\"true\""/>" + "\n"
            fs.appendFileSync(changelogPath,text,function(err){
                if(err) {
                    throw new Error("File Cannot be Appended")
                }
            });
       

        var endText= "</changeSet>" + "\n" + "</databaseChangeLog>"
        fs.appendFileSync(changelogPath, endText, function(err){
            if(err) {
                throw new Error("File Cannot be Appended")
            }
        });
        
        return true 
    }
    }

    execute(typeOfMigration,schemaName,username,dbChange,migrationsDir){

        var changesetPath =  migrationsDir +'/'+schemaName + "/" + "sql"
        let changesetName 
        let self=this;
        let returnVal=[];
        try {
            var schemaFolders=fs.readdirSync(migrationsDir);
            schemaFolders.forEach(item => {
                var schemaDir=migrationsDir+'/'+item
                
                if (self.isDir(schemaDir) && item==schemaName){
                    var id = dbChange
                    var changelogPath=schemaDir+'/changelog/'+item+'.xml' 
                    var version="00"
    
                    version=Number(version) + 1;
                    version = version.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
                    changesetName=self.createChangeset(typeOfMigration,dbChange,changesetPath,version)

                    var ret=self.updateChangelog(typeOfMigration,changelogPath,changesetName,username,id)
                    returnVal.push(ret,changesetName)               
                   
                }
            })
            return returnVal
       }
        catch(err){
            console.log(err)
            return false
        }
   }
} //endOfClass


