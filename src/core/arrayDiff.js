// Hirschberg's algorithm
// http://en.wikipedia.org/wiki/Hirschberg%27s_algorithm
define(function (require) {

    function defaultCompareFunc(a, b) {
        return a === b;
    }

    function createItem(cmd, idx) {
        return {
            cmd: cmd,
            idx: idx
        };
    }

    var abs = Math.abs;
    // Needleman-Wunsch score
    function score(arr0, arr1, i0, i1, j0, j1, equal, memo) {
        var last;
        var invM = i0 > i1;
        var invN = j0 > j1;
        var m = abs(i1 - i0);
        var n = abs(j1 - j0);
        for (var i = 0; i <= m; i++) {
            for (var j = 0; j <= n; j++) {
                if (i === 0) {
                    memo[j] = j;
                }
                else if (j === 0) {
                    last = memo[j];
                    memo[j] = i;
                }
                else {
                    // memo[i-1][j-1] + same(arr0[i-1], arr1[j-1]) ? 0 : 1
                    // Retained or replace
                    var val0 = arr0[invM ? (i1 - i) : (i - 1 + i0)];
                    var val1 = arr1[invN ? (j1 - j) : (j - 1 + j0)];
                    // Because replace needs two dom operation
                    // It has a higher score than removing or adding
                    var score0 = last + (equal(val0, val1) ? 0 : 2);
                    // memo[i-1][j] + 1
                    // Remove arr0[i-1]
                    var score1 = memo[j] + 1;
                    // memo[i][j-1] + 1
                    // Add arr1[j-1]
                    var score2 = memo[j - 1] + 1;

                    last = memo[j];
                    memo[j] = Math.min(score0, score1, score2);
                }
            }
        }

        return memo;
    }

    function hirschberg(arr0, arr1, i0, i1, j0, j1, equal, score0, score1) {
        var out = [];
        var len0 = i1 - i0;
        var len1 = j1 - j0;
        var i;
        var j;
        if (! len0) {
            for (j = 0; j < len1; j++) {
                out.push(createItem('+', j + j0));
            }
        }
        else if (! len1) {
            for (i = 0; i < len0; i++) {
                out.push(createItem('-', i + i0));
            }
        }
        else if (len0 === 1) {
            var a = arr0[i0];
            var matched = false;
            for (j = 0; j < len1; j++) {
                if (equal(a, arr1[j + j0]) && ! matched) {
                    matched = true;
                    out.push(createItem('=', j + j0));
                }
                else {
                    if (j === len1 - 1 && ! matched) {
                        out.push(createItem('^', j + j0));
                    }
                    else {
                        out.push(createItem('+', j + j0));
                    }
                }
            }
        }
        else if (len1 === 1) {
            var b = arr1[j0];
            var matched = false;
            for (i = 0; i < len0; i++) {
                if (equal(b, arr0[i + i0]) && ! matched) {
                    matched = true;
                    out.push(createItem('=', i + i0));
                }
                else {
                    if (i === len0 - 1 && ! matched) {
                        out.push(createItem('^', i + i0));
                    }
                    else {
                        out.push(createItem('-', i + i0));
                    }
                }
            }
        }
        else {
            var imid = ((len0 / 2) | 0) + i0;

            score(arr0, arr1, i0, imid, j0, j1, equal, score0);
            score(arr0, arr1, i1, imid + 1, j1, j0, equal, score1);

            var min = Infinity;
            var jmid = 0;
            var sum;
            for (j = 0; j <= len1; j++) {
                sum = score0[j] + score1[len1 - j];
                if (sum < min) {
                    min = sum;
                    jmid = j;
                }
            }
            jmid += j0;

            out = hirschberg(arr0, arr1, i0, imid, j0, jmid, equal, score0, score1);
            var out1 = hirschberg(arr0, arr1, imid, i1, jmid, j1, equal, score0, score1);
            // Concat
            for (var i = 0; i < out1.length; i++) {
                out.push(out1[i]);
            }
        }
        return out;
    }

    function arrayDiff(arr0, arr1, equal) {
        return hirschberg(arr0, arr1, 0, arr0.length, 0, arr1.length, equal || defaultCompareFunc, [], []);
        // return score(arr0, arr1, 0, arr0.length, 0, arr1.length, equal || defaultCompareFunc, []);
    }

    // module.exports = arrayDiff;
    return arrayDiff;
});