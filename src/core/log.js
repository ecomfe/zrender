import {debugMode} from '../config';

var logError = function () {
};

if (debugMode === 1) {
    logError = console.error;
}

export default logError;
