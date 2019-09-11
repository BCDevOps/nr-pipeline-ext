var fs = require('fs'); 
var moment = require('moment-timezone')
const replace = require('replace-in-file');

if (process.argv.length <= 4 ) {
    console.log("Usage: " + __filename + " SCHEMA_NAME " + "USERNAME" + " RFC_NO" + " COMMA_SEPERATED_LIST_OF_DB_CHANGES");
    process.exit(-1);
}
 function createChangeset(dbChange,changesetPath,rfcNo,version)
{          
        var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
        var newFileName=changesetPath+'/'+'V'+tDate+version+'__'+rfcNo+'_'+dbChange+'.sql'
        fs.open(newFileName, 'w', function(err,file){
            if(err) throw err;
            console.log('File '+newFileName+' was created successfully')
        }); 
        return newFileName
}

function isDir(path) {
    try {
        var stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}

 function updateChangelog(changelogPath,changesetList,username,id){   
    const options = {
        files: changelogPath,
        from: "</databaseChangeLog>",
        to: ' ',
      };
      results = replace.sync(options)
      var startText= "<changeSet author=\"" + username + "\" id=\"" + id + "\">" + '\n' 
        fs.appendFileSync(changelogPath, startText, function(err) {
        });
        changesetList.forEach(async function(changeset){
                  var text="\t<sqlFile path=\""+changeset +"\"/>" + "\n"
                  fs.appendFileSync(changelogPath,text,function(err){
                      if(err) throw err;
                });
              });
                var endText= "</changeSet>" + "\n" + "</databaseChangeLog>"
                fs.appendFileSync(changelogPath, endText, function(err){
                }); 
        }

async function execute(){
    var schemaName = process.argv[2];
    var username = process.argv[3]
    var rfcNo = process.argv[4]
    var changes = process.argv[5]
    var tDate=moment.tz(Date.now(),'America/Vancouver').format('YYYYMMDDHHmmss')
    var changesetPath = '../migrations/'+schemaName + "/" + "sql"
    var dbChange = changes.split(',')
    var changesetList = []
  fs.readdir('../migrations', async function(err, items) {
    for (i=0;i<items.length;i++){
        var schemaDir='../migrations/'+items[i]
         if (isDir(schemaDir) && items[i]==schemaName){
            
            var id = tDate
            var changelogPath=schemaDir+'/changelog/'+items[i]+'.xml' 
            var version="00"

            dbChange.forEach(async function(change){
                version=Number(version) + 1;
                version = version.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
                changesetList.push(createChangeset(change,changesetPath,rfcNo,version))
            });
                
              updateChangelog(changelogPath,changesetList,username,id)
            }
   }
});  
}

async function main(){
    await execute();
}

main()
