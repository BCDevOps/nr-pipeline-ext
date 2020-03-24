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
                    level: 'error',
                    filename: path.join(__dirname, '..', 'logs', 'trace.log'),
                }),
                new transports.Console({
                    level: 'debug',
                    colorize: true,
                    format: combine(
                        label({ label: 'nr-pipeline-ext' }),
                        timestamp(),
                        format.align(),
                        format.prettyPrint(),
                        format.splat(),
                        format.colorize({
                            all: true, // this is important otherwise only 'level' will be colored, not the message.
                            colors: {
                                error: 'bold red',
                                warn: 'bold yellow',
                                info: 'green',
                                verbose: 'cyan',
                                debug: 'white',
                            },
                        }),
                        myFormat
                    ),
                }),
            ],
            exitOnError: false,
        },
    },
}

module.exports = logSettings
