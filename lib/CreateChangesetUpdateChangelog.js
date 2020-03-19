const fs = require('fs')
const moment = require('moment-timezone')
const replace = require('replace-in-file')

module.exports = class {
    verifyifChangesetExists(changeset, changelogPath) {
        const path = changelogPath.split('/')
        let changelogDir = path[0] + '/'
        for (let i = 1; i < path.length - 2; i++) {
            changelogDir += path[i] + '/'
        }
        changelogDir += 'sql'
        // changelogDir1=changelog.dirname
        const contents = fs.readdirSync(changelogDir, 'utf8')
        const nameOfChangeSet = changeset.split('/')[4]
        if (fs.existsSync(changeset)) {
            const size = fs.statSync(changeset).size
            if (contents.includes(nameOfChangeSet) && size > 0) {
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    }

    createChangeset(typeOfMigration, dbChange, changesetPath, changelogPath, version) {
        if (typeOfMigration.toLowerCase() === 'versioned') {
            const tDate = moment.tz(Date.now(), 'America/Vancouver').format('YYYYMMDDHHmmss')
            const newFileName = changesetPath + '/' + 'V' + tDate + version + '__' + '_' + dbChange + '.sql'
            const result = this.verifyifChangesetExists(newFileName, changelogPath)
            if (result) {
                throw new Error(
                    'This changeset file already exists! Please modify the same file for making changes and ensure it is a repeatable migration'
                )
            } else {
                fs.open(newFileName, 'w', function(err, file) {
                    if (err) throw err
                })
                return newFileName
            }
        } else if (typeOfMigration.toLowerCase() === 'repeatable') {
            const newFileName = changesetPath + '/' + 'R' + '__' + dbChange + '.sql'
            if (this.verifyifChangesetExists(newFileName, changelogPath)) {
                throw new Error(
                    'This changeset file already exists! Please modify the same file for making changes and ensure it is a repeatable migration'
                )
            } else {
                fs.open(newFileName, 'w', function(err, file) {
                    if (err) throw err
                })
                return newFileName
            }
        } else {
            throw new Error('Invalid Migration Type')
        }
    }

    isDir(path) {
        try {
            const stat = fs.lstatSync(path)
            return stat.isDirectory()
        } catch (err) {
            // lstatSync throws an error if path doesn't exist
            return false
        }
    }

    updateChangelog(typeOfMigration, changelogPath, changeset, username, id, typeOfObject) {
        const options = {
            files: changelogPath,
            from: '</databaseChangeLog>',
            to: ' ',
        }
        replace.sync(options)
        const nameOfChangeSet = changeset.split('/')[4]
        let endText, startText
        if (this.verifyifChangesetExists(changeset, changelogPath)) {
            endText = '\n' + '</databaseChangeLog>'
            fs.appendFileSync(changelogPath, endText, function(err) {
                if (err) {
                    throw new Error('File Cannot be Appended')
                }
            })
            throw new Error(
                'This file already exists, meaning there is a changeset created for this object, modify the same file and make sure it is Repeatable Migration in the changelog file'
            )
        } else {
            if (typeOfMigration.toLowerCase() === 'versioned') {
                startText = '<changeSet author="' + username + '" id="' + id + '">' + '\n'
            } else if (typeOfMigration.toLowerCase() === 'repeatable') {
                startText = '<changeSet author="' + username + '" id="' + id + '" runOnChange="true' + '">' + '\n'
            }
            fs.appendFileSync(changelogPath, startText, function(err) {
                if (err) {
                    throw new Error('File Cannot be Appended')
                }
            })
            let text
            if (typeOfObject === 'package') {
                text =
                    '\t<sqlFile path="../sql/' +
                    nameOfChangeSet +
                    '" splitStatements="false" relativeToChangelogFile="true"/>' +
                    '\n'
            } else {
                text =
                    '\t<sqlFile path="../sql/' +
                    nameOfChangeSet +
                    '" splitStatements="true" relativeToChangelogFile="true"/>' +
                    '\n'
            }

            fs.appendFileSync(changelogPath, text, function(err) {
                if (err) {
                    throw new Error('File Cannot be Appended')
                }
            })

            endText = '</changeSet>' + '\n' + '</databaseChangeLog>'
            fs.appendFileSync(changelogPath, endText, function(err) {
                if (err) {
                    throw new Error('File Cannot be Appended')
                }
            })

            return true
        }
    }

    execute(typeOfMigration, schemaName, username, dbChange, migrationsDir, typeOfObject) {
        const changesetPath = migrationsDir + '/' + schemaName + '/' + 'sql'
        const tDate = moment.tz(Date.now(), 'America/Vancouver').format('YYYYMMDDHHmmss')
        const self = this
        const returnVal = []
        try {
            const schemaFolders = fs.readdirSync(migrationsDir)
            schemaFolders.forEach(item => {
                const schemaDir = migrationsDir + '/' + item
                if (self.isDir(schemaDir) && item === schemaName) {
                    const id = tDate
                    const changelogPath = schemaDir + '/changelog/' + item + '.xml'
                    let version = '00'

                    version = Number(version) + 1
                    version = version.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })
                    const changesetName = self.createChangeset(
                        typeOfMigration,
                        dbChange,
                        changesetPath,
                        changelogPath,
                        version
                    )

                    const ret = self.updateChangelog(
                        typeOfMigration,
                        changelogPath,
                        changesetName,
                        username,
                        id,
                        typeOfObject
                    )
                    returnVal.push(ret, changesetName)
                }
            })
            return returnVal
        } catch (err) {
            console.log(err)
            return false
        }
    }
} // endOfClass
