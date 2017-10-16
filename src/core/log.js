import {debugMode} from '../config';

var log = function () {
};

if (debugMode === 1) {
    log = function () {
        for (var k in arguments) {
            throw new Error(arguments[k]);
        }
    };
}
else if (debugMode > 1) {
    log = function () {
        for (var k in arguments) {
            console.log(arguments[k]);
        }
    };
}

export default log;