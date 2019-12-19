const Generator = require('./CreateChangesetUpdateChangelog');

(() => {

if (process.argv.length <= 4 ) {
    console.log("Usage: " + __filename + " SCHEMA_NAME " + "USERNAME" + " RFC_NO" + " COMMA_SEPERATED_LIST_OF_FILE_DESCRIPTIONS");
    process.exit(-1);
}
let schemaname = process.argv[2];
let username = process.argv[3]
let rfcNo = process.argv[4]
let changes = process.argv[5]

const generate=new Generator()
generate.execute(schemaname,username,rfcNo,changes)
})();