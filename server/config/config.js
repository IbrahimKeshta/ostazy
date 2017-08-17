var env = process.env.NODE_ENV || 'development' // only set on horuko

if (env === 'development' || env === 'test') {
    var config = require('./config.json');
    var envConfig = config[env]; // return an objects of the env
    // takes an object like envConfig return them as array
    Object.keys(envConfig).forEach((key) => {
        process.env[key] = envConfig[key];
    });
}
