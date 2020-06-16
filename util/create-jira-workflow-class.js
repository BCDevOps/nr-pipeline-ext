const fs = require('fs')
const convert = require('xml-js')
const xml = fs.readFileSync(`${process.argv[2]}`, 'utf8')
// const xml = require('fs').readFileSync('lib/assets/RFD-Workflow-V1.2.xml', 'utf8')
const options = { compact: true, ignoreComment: true, alwaysArray: true }
const result = convert.xml2js(xml, options) // or convert.xml2json(xml, options)

const STEPS = new Map()
// index all steps by @id
for (const step of result.workflow[0].steps[0].step) {
    STEPS.set(step._attributes.id, Object.assign({ 'jira.status.id': step.meta[0]._text[0] }, step._attributes))
}

const INITIAL_STEP = STEPS.get(
    result.workflow[0]['initial-actions'][0].action[0].results[0]['unconditional-result'][0]._attributes.step
)
// console.dir(INITIAL_STEP)
// process.exit()

for (const step of result.workflow[0].steps[0].step) {
    const stepRef = STEPS.get(step._attributes.id)
    stepRef.actions = stepRef.actions || []
    // const fromStatusId = console.dir(step.meta[0]._text[0])
    // STEPS.set(step._attributes.id, step._attributes)
    // step.meta._attributes.
    if (step.actions[0].action) {
        for (const action of step.actions[0].action) {
            const targetStepId = action.results[0]['unconditional-result'][0]._attributes.step
            // const targetStepRef = STEPS.get(targetStepId)
            // console.dir()
            stepRef.actions.push(Object.assign({ targetStep: targetStepId }, action._attributes))
        }
    }
}

function cname(string) {
    return string
        .toUpperCase()
        .replace(/ /g, '_')
        .replace(/-/g, '_')
}

function acname(statusName) {
    return `ACTION_${cname(statusName)}`
}

function scname(statusName) {
    return `STATUS_${cname(statusName)}`
}

const outputFile = `${process.argv[3]}`
fs.appendFileSync(outputFile, '/* eslint-disable prettier/prettier */\n', { flag: 'w' })
fs.appendFileSync(outputFile, "'use strict'\n", { flag: 'a' })

fs.appendFileSync(outputFile, '\n', { flag: 'a' })
for (const step of STEPS.values()) {
    fs.appendFileSync(
        outputFile,
        `const ${scname(step.name)} = { id: '${step['jira.status.id']}', name: '${step.name}' }\n`,
        {
            flag: 'a',
        }
    )
}
fs.appendFileSync(outputFile, '\n', { flag: 'a' })
for (const step of STEPS.values()) {
    for (const action of step.actions) {
        const targetStepRef = STEPS.get(action.targetStep)
        fs.appendFileSync(
            outputFile,
            `const ${acname(action.id)} = { name: '${action.name}', id: '${action.id}', to: {...${scname(
                targetStepRef.name
            )}} }\n`,
            {
                flag: 'a',
            }
        )
    }
}
fs.appendFileSync(outputFile, '\n', { flag: 'a' })
fs.appendFileSync(outputFile, 'const ACTIONS = {\n', { flag: 'a' })
for (const step of STEPS.values()) {
    for (const action of step.actions) {
        fs.appendFileSync(outputFile, `    [${acname(action.id)}.id]:${acname(action.id)},\n`, {
            flag: 'a',
        })
    }
}
fs.appendFileSync(outputFile, '}\n', { flag: 'a' })
fs.appendFileSync(outputFile, 'const WORKFLOW = {\n', { flag: 'a' })
for (const step of STEPS.values()) {
    fs.appendFileSync(outputFile, `    [${scname(step.name)}.id]: [\n`, { flag: 'a' })
    for (const action of step.actions) {
        fs.appendFileSync(outputFile, `      ${acname(action.id)},\n`, { flag: 'a' })
    }
    fs.appendFileSync(outputFile, '    ],\n', { flag: 'a' })
}
fs.appendFileSync(outputFile, '}\n', { flag: 'a' })
fs.appendFileSync(outputFile, '\n', { flag: 'a' })
fs.appendFileSync(outputFile, 'module.exports = class {\n', { flag: 'a' })
fs.appendFileSync(outputFile, `    static INITIAL_STATUS = ${scname(INITIAL_STEP.name)}\n`, { flag: 'a' })
fs.appendFileSync(outputFile, '    static getTransitionsByStatusId(statusId) {\n', { flag: 'a' })
fs.appendFileSync(outputFile, '        return WORKFLOW[statusId]\n', { flag: 'a' })
fs.appendFileSync(outputFile, '    }\n\n', { flag: 'a' })
fs.appendFileSync(outputFile, '    static getTransitionById(transitionId) {\n', { flag: 'a' })
fs.appendFileSync(outputFile, '        return ACTIONS[transitionId]\n', { flag: 'a' })
fs.appendFileSync(outputFile, '    }\n', { flag: 'a' })
fs.appendFileSync(outputFile, '}\n', { flag: 'a' })
