/**
 * Both used by zrender and echarts.
 */

module.exports = function ({types, template}, options) {
    return {
        visitor: {
            IfStatement: {
                exit(path) {
                    removeDEV(path);
                }
            }
        }
    };
};

module.exports.recheckDEV = function (code) {
    let result = code.match(/.if\s*\([^()]*__DEV__/);
    if (result
        && result[0].indexOf('`if') < 0
        && result[0].indexOf('if (typeof __DEV__') < 0
    ) {
        throw new Error('__DEV__ is not removed.');
    }
};

function removeDEV(path) {
    if (path.node.test.name === '__DEV__') {
        path.remove();
    }
}


