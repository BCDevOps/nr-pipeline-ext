var fs = require('fs'); 
var moment = require('moment-timezone')
const replace = require('replace-in-file');

module.exports = class {
    constructor() {
    }
    createChangeset(typeOfMigration,dbChange,changesetPath,version){ 
        //console.log(typeOfMigration)
        if(typeOfMigration.toLowerCase()=='versioned'){       
            var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
            var newFileName=changesetPath+'/'+'V'+tDate+version+'__'+'_'+typeOfObject+'_'+nameOfObject +'.sql'
            fs.open(newFileName, 'w', function(err,file){
                if(err) throw err;
                    console.log('File '+newFileName+' was created successfully')
                }); 
            return newFileName
        }
        else if(typeOfMigration.toLowerCase()=='repeatable'){
            var newFileName=changesetPath+'/'+'R'+'__'+dbChange+'.sql'
            fs.open(newFileName, 'w', function(err,file){
                if(err) throw err;
                    console.log('File '+newFileName+' was created successfully')
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
      //changesetList.forEach(async function(changeset){
        const options = {
            files: changelogPath,
            from: "</databaseChangeLog>",
            to: ' ',
        };
        replace.sync(options)
        var contents=fs.readFileSync(changelogPath, 'utf8')
        console.log(contents)
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
            var text="\t<sqlFile path=\""+changeset +"\"/>" + "\n"
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
      // });
        console.log("The changelog file has been successfully updated")
        return true 
    }
    }

   execute(typeOfMigration,schemaName,username,dbChange,migrationsDir){
       //console.log(migrationsDir)
        var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
        var changesetPath =  migrationsDir +'/'+schemaName + "/" + "sql"
        //var dbChange = changes.split(',')
        let changesetName 
        let self=this;
        try {
        fs.readdir(migrationsDir, function(err, items) {
            for (var i=0;i<items.length;i++){
                var schemaDir=migrationsDir+'/'+items[i]
                
                if (self.isDir(schemaDir) && items[i]==schemaName){
                    var id = dbChange
                    var changelogPath=schemaDir+'/changelog/'+items[i]+'.xml' 
                    var version="00"
    
                   // dbChange.forEach(function(change){
                        version=Number(version) + 1;
                        version = version.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
                        changesetName=self.createChangeset(typeOfMigration,dbChange,changesetPath,version)
                   // });
                
                   self.updateChangelog(typeOfMigration,changelogPath,changesetName,username,id)
                    
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


