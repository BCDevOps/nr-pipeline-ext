const Generator = require('./CreateChangesetUpdateChangelog');
const inquirer = require('inquirer')
var fs = require('fs'); 

let migrationsDir
if (process.argv.length <= 2 ){
  console.log( "No arguments passed, thereby using default directory path, ../migrations")
  migrationsDir="../migrations"
  
}
else if(process.argv.length == 3) {
    if (process.argv[2]=="help"){
        console.log("USAGE: \n")
        console.log("If migrations folder path is ../migrations ,run: npm run generate")
        console.log("If migrations folder path is custom path ,run: npm run generate -- --migrations.dir=<custom_path_relative_to_.pipeline>")
        console.log("For Help, run: npm run generate -- help")
    }
    else{
        migrationsDir = process.argv[2].split("=")[1]
          
    }
}
else {
    console.log("USAGE: \n")
    console.log("If migrations folder path is ../migrations ,run: npm run generate")
    console.log("If migrations folder path is custom path ,run: npm run generate -- --migrations.dir=<'custom_path_relativ_to_.pipeline'")
    console.log("For Help, run: npm run generate -- help")
}

if(migrationsDir){
    try{
    var folders=fs.readdirSync(migrationsDir)
    }
    catch(err){
        throw new Error ("This is not the migrations folder for this repo, try again using the command \n npm run generate -- --migrations.dir='<relativePath>'")
    }
   ask()
}

function ask(){
    inquirer.prompt([
        {
        type: 'input',
        name: 'Continue',
        message: "Do you want to add a new changeset(y/n, Press y for yes, any other key for no)?",
        }
    ]).then(answer =>{
    if(answer.Continue=='y'|| answer.Continue=='Y' || answer.Continue.toLowerCase()=='yes'){
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
                const value=text.replace(/[ #$.&*-]/g,'_')
                return value
            }
          }
    
    ]).then(answers => {
        //console.log(JSON.stringify(answers, null, '  '));
        const generate=new Generator()
        const dbChange= answers.nameOfObject.replace(/[ #$.&*-]/g,'_').toUpperCase() + "." + answers.typeOfObject.toLowerCase()
        const retVal= generate.execute(answers.typeOfMigration.toString(),answers.schemaname,answers.username,dbChange,answers.migrationsDir)
        if(retVal[0]){
            console.log('File '+retVal[1]+' was created successfully')
            console.log("The changelog file, ../migrations/"+answers.schemaname+"/changelog/"+answers.schemaname+".xml has been successfully updated")
        }
        ask()
        
    }) 
    }
    else {
        console.log("########### End Of Script ############")
    }
    })
}
