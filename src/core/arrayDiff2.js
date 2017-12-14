// Myers' Diff Algorithm
// Modified from https://github.com/kpdecker/jsdiff/blob/master/src/diff/base.js

function Diff() {}

Diff.prototype = {
    diff: function (oldArr, newArr, equals) {
        if (!equals) {
            equals = function (a, b) {
                return a === b;
            };
        }
        this.equals = equals;

        var self = this;

        oldArr = oldArr.slice();
        newArr = newArr.slice();
        // Allow subclasses to massage the input prior to running
        var newLen = newArr.length;
        var oldLen = oldArr.length;
        var editLength = 1;
        var maxEditLength = newLen + oldLen;
        var bestPath = [{ newPos: -1, components: [] }];

        // Seed editLength = 0, i.e. the content starts with the same values
        var oldPos = this.extractCommon(bestPath[0], newArr, oldArr, 0);
        if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
            var indices = [];
            for (var i = 0; i < newArr.length; i++) {
                indices.push(i);
            }
            // Identity per the equality and tokenizer
            return [{
                indices: indices, count: newArr.length
            }];
        }

        // Main worker method. checks all permutations of a given edit length for acceptance.
        function execEditLength() {
            for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
                var basePath;
                var addPath = bestPath[diagonalPath - 1];
                var removePath = bestPath[diagonalPath + 1];
                var oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
                if (addPath) {
                    // No one else is going to attempt to use this value, clear it
                    bestPath[diagonalPath - 1] = undefined;
                }

                var canAdd = addPath && addPath.newPos + 1 < newLen;
                var canRemove = removePath && 0 <= oldPos && oldPos < oldLen;
                if (!canAdd && !canRemove) {
                    // If this path is a terminal then prune
                    bestPath[diagonalPath] = undefined;
                    continue;
                }

                // Select the diagonal that we want to branch from. We select the prior
                // path whose position in the new string is the farthest from the origin
                // and does not pass the bounds of the diff graph
                if (!canAdd || (canRemove && addPath.newPos < removePath.newPos)) {
                    basePath = clonePath(removePath);
                    self.pushComponent(basePath.components, undefined, true);
                }
                else {
                    basePath = addPath;   // No need to clone, we've pulled it from the list
                    basePath.newPos++;
                    self.pushComponent(basePath.components, true, undefined);
                }

                oldPos = self.extractCommon(basePath, newArr, oldArr, diagonalPath);

                // If we have hit the end of both strings, then we are done
                if (basePath.newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
                    return buildValues(self, basePath.components, newArr, oldArr);
                }
                else {
                    // Otherwise track this path as a potential candidate and continue.
                    bestPath[diagonalPath] = basePath;
                }
            }

            editLength++;
        }

        while (editLength <= maxEditLength) {
            var ret = execEditLength();
            if (ret) {
                return ret;
            }
        }
    },

    pushComponent: function (components, added, removed) {
        var last = components[components.length - 1];
        if (last && last.added === added && last.removed === removed) {
            // We need to clone here as the component clone operation is just
            // as shallow array clone
            components[components.length - 1] = {count: last.count + 1, added: added, removed: removed };
        }
        else {
            components.push({count: 1, added: added, removed: removed });
        }
    },
    extractCommon: function (basePath, newArr, oldArr, diagonalPath) {
        var newLen = newArr.length;
        var oldLen = oldArr.length;
        var newPos = basePath.newPos;
        var oldPos = newPos - diagonalPath;
        var commonCount = 0;

        while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newArr[newPos + 1], oldArr[oldPos + 1])) {
            newPos++;
            oldPos++;
            commonCount++;
        }

        if (commonCount) {
            basePath.components.push({count: commonCount});
        }

        basePath.newPos = newPos;
        return oldPos;
    },
    tokenize: function (value) {
        return value.slice();
    },
    join: function (value) {
        return value.slice();
    }
};

function buildValues(diff, components, newArr, oldArr) {
    var componentPos = 0;
    var componentLen = components.length;
    var newPos = 0;
    var oldPos = 0;

    for (; componentPos < componentLen; componentPos++) {
        var component = components[componentPos];
        if (!component.removed) {
            var indices = [];
            for (var i = newPos; i < newPos + component.count; i++) {
                indices.push(i);
            }
            component.indices = indices;
            newPos += component.count;
            // Common case
            if (!component.added) {
                oldPos += component.count;
            }
        }
        else {
            var indices = [];
            for (var i = oldPos; i < oldPos + component.count; i++) {
                indices.push(i);
            }
            component.indices = indices;
            oldPos += component.count;
        }
    }

    return components;
}

function clonePath(path) {
    return { newPos: path.newPos, components: path.components.slice(0) };
}

var arrayDiff = new Diff();

export default function (oldArr, newArr, callback) {
    return arrayDiff.diff(oldArr, newArr, callback);
}