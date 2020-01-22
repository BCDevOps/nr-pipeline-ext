const Generator = require('./CreateChangesetUpdateChangelog');

(async () => {

if (process.argv.length <= 5 ) {
    console.log("Usage: " + " npm run generate" + " R (for repeatable migrations) or V (for versioned migrations)" + " SCHEMA_NAME " + "USERNAME" + " RFC_NO" + " COMMA_SEPERATED_LIST_OF_FILE_DESCRIPTIONS" + " PATH_TO_MIGRATIONS_DIR");
    process.exit(-1);
}
let typeOfMigration = process.argv[2];
let schemaname = process.argv[3];
let username = process.argv[4]
let rfcNo = process.argv[5]
let changes = process.argv[6]
let migrations_dir = process.argv[7]

const generate=new Generator()
generate.execute(typeOfMigration,schemaname,username,rfcNo,changes,migrations_dir)
})();