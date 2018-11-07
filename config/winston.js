const {
    createLogger,
    format,
    transports
} = require('winston');

const {
    combine,
    timestamp,
    label,
    printf
} = format;

const myFormat = printf(info => {
    return `[${info.timestamp}][${info.level}] : ${info.message}`; //[${info.label}]
});

const logger = createLogger({
    format: combine(
        label({
            label:''
        }),
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({
            level: 'warn',
            filename: './logs/error.log',
            json: true
        }),
        new transports.File({
            filename: './logs/combined.log'
        })
    ]
});

module.exports = logger;