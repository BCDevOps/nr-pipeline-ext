const Generator = require('./CreateChangesetUpdateChangelog');

(async () => {

if (process.argv.length <= 5 ) {
    console.log("Usage: " + " npm run generate" + " SCHEMA_NAME " + "USERNAME" + " RFC_NO" + " COMMA_SEPERATED_LIST_OF_FILE_DESCRIPTIONS" + " PATH_TO_MIGRATIONS_DIR");
    process.exit(-1);
}
let schemaname = process.argv[2];
let username = process.argv[3]
let rfcNo = process.argv[4]
let changes = process.argv[5]
let migrations_dir = process.argv[6]

const generate=new Generator()
generate.execute(schemaname,username,rfcNo,changes,migrations_dir)
})();