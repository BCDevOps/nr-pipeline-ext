var fs = require('fs'); 
var moment = require('moment-timezone')
const replace = require('replace-in-file');


(function () {
    if (process.argv.length <= 4 ) {
        console.log("Usage: " + __filename + " SCHEMA_NAME " + "USERNAME" + " RFC_NO" + " COMMA_SEPERATED_LIST_OF_DB_CHANGES");
        process.exit(-1);
    }
    let schemaName = process.argv[2];
    let username = process.argv[3]
    let rfcNo = process.argv[4]
    let changes = process.argv[5]
    var stat=execute(schemaName,username,rfcNo,changes)

   module.exports.createChangeset=createChangeset;
    function createChangeset(dbChange,changesetPath,rfcNo,version)
{          
        var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
        var newFileName=changesetPath+'/'+'V'+tDate+version+'__'+rfcNo+'_'+dbChange+'.sql'
        fs.open(newFileName, 'w', function(err,file){
            if(err) throw err;
            console.log('File '+newFileName+' was created successfully')
        }); 
        return newFileName
};
module.exports.isDir=isDir;
function isDir(path) {
    try {
        var stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}
module.exports.updateChangelog=updateChangelog;
function updateChangelog(changelogPath,changesetList,username,id){   
    const options = {
        files: changelogPath,
        from: "</databaseChangeLog>",
        to: ' ',
      };
      results = replace.sync(options)
      var startText= "<changeSet author=\"" + username + "\" id=\"" + id + "\">" + '\n' 
        fs.appendFileSync(changelogPath, startText, function(err) {
            if(err) {
                console.log(err)
                return false;
            }
        });
        changesetList.forEach(async function(changeset){
                  var text="\t<sqlFile path=\""+changeset +"\"/>" + "\n"
                  fs.appendFileSync(changelogPath,text,function(err){
                      if(err) {
                        console.log(err)
                        return false;
                      }
                });
              });
                var endText= "</changeSet>" + "\n" + "</databaseChangeLog>"
                fs.appendFileSync(changelogPath, endText, function(err){
                    if(err) {
                        console.log(err)
                        return false;
                      }
                });
                return true 

        };

module.exports.execute=execute;
function execute(schemaName,username,rfcNo,changes){

    var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
    var changesetPath = '../migrations/'+schemaName + "/" + "sql"
    var dbChange = changes.split(',')
    var changesetList = []
fs.readdir('../migrations',function(err, items) {
    if(err){
        console.log(err)
        return false
    }
    for (i=0;i<items.length;i++){
        var schemaDir='../migrations/'+items[i]
         if (isDir(schemaDir) && items[i]==schemaName){
            
            var id = tDate
            var changelogPath=schemaDir+'/changelog/'+items[i]+'.xml' 
            var version="00"

            dbChange.forEach(function(change){
                version=Number(version) + 1;
                version = version.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
                changesetList.push(createChangeset(change,changesetPath,rfcNo,version))
            });
            
              updateChangelog(changelogPath,changesetList,username,id)
            }
        }
       
    })
    return true
}

})();