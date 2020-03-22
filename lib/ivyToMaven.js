const inquirer = require('inquirer')
const { logger } = require('./logger')
const path = require('path')
const GenPom = require('./GeneratePom')

_askUserInputs().then(userInputs => {
    const genPom = new GenPom(userInputs)
    genPom.run()
})

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
