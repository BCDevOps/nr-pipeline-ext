const { program } = require('commander')
const inquirer = require('inquirer')
const { logger } = require('./logger')
const path = require('path')
const GenPom = require('./GeneratePom')

logger.info(
    `Running ivyToMaven.js...
    \n\n =============== This program will convert Ant/Ivy build dependencies to basic Maven pom.xml =============== \n
     !!! Ensure the project build.xml can successfully build before conversion !!! \n
    `
)

program
    .description('This program will convert Ant/Ivy build dependencies to basic Maven pom.xml')
    .option('-p, --interactive', 'Prompt for inputs')
    .option('-b, --buildFilePath <path to biuld.xml>', 'The path to project Ant build.xml')
    .option('-y, --ivyFilePath <path to ivy.xml>', 'The path to project ivy.xml')
    .option('-t, --targetPomPath <path for generated pom.xml>', 'The path to generate pom.xml')

program.parse(process.argv)

if (program.interactive) {
    _askUserInputs().then(userInputs => {
        const genPom = new GenPom(userInputs)
        return genPom.run()
    })
} else {
    const genPom = new GenPom({
        buildFilePath: program.buildFilePath,
        ivyFilePath: program.ivyFilePath,
        targetPomPath: program.targetPomPath,
    })
    genPom.run()
}

// ------------------------------------------------------------------
// Prepare from user inputs
function _askUserInputs() {
    const inputs = {}
    return inquirer
        .prompt([
            {
                type: 'list',
                message: 'Before conversion, have you made sure ant build is working?',
                name: 'precondition',
                choices: ['YES', 'NO'],
                default: 'NO',
            },
        ])
        .then(answer => {
            Object.assign(inputs, answer)
            if (answer.precondition === 'YES') {
                return inquirer.prompt([
                    {
                        type: 'input',
                        name: 'buildFilePath',
                        message: 'Where is your Ant build.xml file path?',
                        default: path.join(process.cwd(), 'build.xml'),
                    },
                    {
                        type: 'input',
                        name: 'ivyFilePath',
                        message: 'Where is your ivy file path?',
                        default: path.join(process.cwd(), 'ivy.xml'),
                    },
                    {
                        type: 'input',
                        name: 'targetPomPath',
                        message: 'Where do you like to place your pom file?',
                        default: path.join(process.cwd(), 'pom.xml'),
                    },
                ])
            } else {
                logger.warn('Please make sure project Ant build is successful before converstion!')
                process.exit(0)
            }
        })
        .then(answer => {
            Object.assign(inputs, answer)
            return Promise.resolve(inputs)
        })
}
