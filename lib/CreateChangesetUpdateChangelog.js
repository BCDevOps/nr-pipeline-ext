var fs = require('fs'); 
var moment = require('moment-timezone')
const replace = require('replace-in-file');

module.exports = class {
    constructor() {
    }
    createChangeset(dbChange,changesetPath,rfcNo,version){        
        var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
        var newFileName=changesetPath+'/'+'V'+tDate+version+'__'+rfcNo+'_'+dbChange+'.sql'
        fs.open(newFileName, 'w', function(err,file){
            if(err) throw err;
                console.log('File '+newFileName+' was created successfully')
            }); 
        return newFileName
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

    updateChangelog(changelogPath,changesetList,username,id){
        const options = {
            files: changelogPath,
            from: "</databaseChangeLog>",
            to: ' ',
        };
        replace.sync(options)
        var startText= "<changeSet author=\"" + username + "\" id=\"" + id + "\">" + '\n' 
        fs.appendFileSync(changelogPath, startText, function(err) {
            if(err) {
                throw new Error("File Cannot be Appended")
            }
        });
        changesetList.forEach(async function(changeset){
            var text="\t<sqlFile path=\""+changeset +"\"/>" + "\n"
            fs.appendFileSync(changelogPath,text,function(err){
                if(err) {
                    throw new Error("File Cannot be Appended")
                }
            });
        });

        var endText= "</changeSet>" + "\n" + "</databaseChangeLog>"
        fs.appendFileSync(changelogPath, endText, function(err){
            if(err) {
                throw new Error("File Cannot be Appended")
            }
        });
        return true 
    }

   execute(schemaName,username,rfcNo,changes, migrationsDir){

       console.log(migrationsDir)
        var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
        var changesetPath =  migrationsDir +'/'+schemaName + "/" + "sql"
        console.log(changesetPath)
        var dbChange = changes.split(',')
        var changesetList = []
        let self=this;
        try {
        fs.readdir(migrationsDir, function(err, items) {
            for (var i=0;i<items.length;i++){
                var schemaDir=migrationsDir+'/'+items[i]
                
                if (self.isDir(schemaDir) && items[i]==schemaName){
                    var id = tDate
                    var changelogPath=schemaDir+'/changelog/'+items[i]+'.xml' 
                    var version="00"
    
                    dbChange.forEach(function(change){
                        version=Number(version) + 1;
                        version = version.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
                        changesetList.push(self.createChangeset(change,changesetPath,rfcNo,version))
                    });
                
                   self.updateChangelog(changelogPath,changesetList,username,id)
                    
                }
            }
           
        })
         
        return true
    }
catch(err){
    console.log(err)
    return false
}
}
} //endOfClass


