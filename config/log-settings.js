const winston = require('winston')
const { format, transports } = winston
const { combine, timestamp, label, printf } = format
const path = require('path')

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`
})

const logSettings = {
    winston: {
        defaultLogConfig: {
            transports: [
                new transports.File({
                    level: 'debug',
                    filename: path.join(__dirname, '..', 'logs', 'trace.log'),
                }),
                new transports.Console({
                    format: combine(label({ label: 'nr-pipeline-ext' }), timestamp(), myFormat),
                }),
            ],
            exitOnError: false,
        },
    },
}

module.exports = logSettings
