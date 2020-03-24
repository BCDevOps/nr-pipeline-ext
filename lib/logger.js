/**
 * This is the basic logger module that by default uses 'winston' as implementation.
 * More setup can be added to ../config/log-settings.js if needed.
 * You can add more logging systems here if needed, like log4js.
 *
 * Basic usage:
 *      const { logger } = require('./logger')
 *      logger.info('Hello World')
 */
const winston = require('winston')

// log settings
const { defaultLogConfig } = require('../config/log-settings').winston

// Create the default logger using winston
const logger = winston.createLogger(defaultLogConfig)

// add more logger with differnt implementation?

module.exports = { logger }
