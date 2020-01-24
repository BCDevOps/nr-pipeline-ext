const Generator = require('./CreateChangesetUpdateChangelog');
const inquirer = require('inquirer')
var fs = require('fs'); 
let choice;
//const options= require('pipeline-cli').Util.parseArguments()

/* if (process.argv.length <= 6 ) {
    console.log("Usage: " + " npm run generate" + " TYPE OF MIGRATION (R for repeatable migrations or V for versioned migrations)" + " SCHEMA_NAME " + "USERNAME" + " RFC_NO" + " COMMA_SEPERATED_LIST_OF_FILE_DESCRIPTIONS" + " PATH_TO_MIGRATIONS_DIR");
    process.exit(-1);
}
let typeOfMigration = process.argv[2];
let schemaname = process.argv[3];
let username = process.argv[4]
let rfcNo = process.argv[5]
let changes = process.argv[6]
let migrations_dir = process.argv[7] */
//do {
let migrationsDir
if (process.argv.length <= 2 ){
  console.log( "No arguments passed, thereby using default directory path, ../migrations")
  migrationsDir="../migrations"
  
}
else if(process.argv.length == 3) {
    if (process.argv[2]=="--help"){
        console.log("USAGE: \n")
        console.log("If migrations folder path is ../migrations ,run: npm run generate")
        console.log("If migrations folder path is custom path ,run: npm run generate -- --migrations.dir=<custom_path_relative_to_.pipeline>")
        console.log("For Help, run: npm run generate -- --help")
    }
    else{
        migrationsDir = process.argv[2].split("=")[1]
          
    }
}
else {
    console.log("USAGE: \n")
    console.log("If migrations folder path is ../migrations ,run: npm run generate")
    console.log("If migrations folder path is custom path ,run: npm run generate -- --migrations.dir=<'custom_path_relativ_to_.pipeline'")
    console.log("For Help, run: npm run generate -- --help")
}

if(migrationsDir){
    try{
    var folders=fs.readdirSync(migrationsDir)
    }
    catch(err){
        throw new Error ("This is not the migrations folder for this repo, try again using the command \n npm run generate -- --migrations.dir='<relativePath>'")
    }

inquirer.prompt([
    {
    type: 'input',
    name: 'Continue',
    message: "Do you want to add a new changeset(y/n)?",
    }
]).then(answer =>{
if(answer.Continue=='y'|| answer.Continue=='Y'){
    inquirer
.prompt([

    {
        type: 'checkbox',
        name: 'typeOfMigration',
        message: 'What type of migration would you want to do?',
        choices: [
            new inquirer.Separator(' = Type of Migration = '),
            {
              name: 'Repeatable'
            },
            {
              name: 'Versioned'
            },
        ]
      },
       {
        type: 'checkbox',
        name: 'schemaname',
        message: 'Which Schema are you modifying?',
        choices: folders,
      }, 
      {
        type: 'input',
        name: 'username',
        message: 'What is your name?',
      },
      {
        type: 'input',
        name: 'migrationsDir',
        message: 'What is the path to the folder(relative to .pipeline) which holds the changelog and changesets for each schema in your REPO (default: ../migrations)?',
        default: '../migrations'
      },
      {
        type: 'input',
        name: 'typeOfObject',
        message: 'What is the type of the database object you are creating/modifying?',
      },
      {
        type: 'input',
        name: 'nameOfObject',
        message: 'What is the name of the database object you are creating/modifying?',
        transformer: function(text,answers,flags){
            const value=text.replace(' ','_')
            return value
        }
      }

]).then(answers => {
    console.log(JSON.stringify(answers, null, '  '));
    const generate=new Generator()
    const dbChange=answers.typeOfObject + '_' + answers.nameOfObject.replace(' ','_')
    generate.execute(answers.typeOfMigration.toString(),answers.schemaname,answers.username,dbChange.toUpperCase(),answers.migrationsDir)
}) 
}
else {
    console.log("########### End Of Script ############")
}
})
  
//console.log(" Do you have more changes you need to make(Y/N):")
 //choice=process.stdin
}
//}while(choice=='y' || choice=='Y')
//})();