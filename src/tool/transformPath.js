define(function (require) {

    var CMD = require('../core/PathProxy').CMD;
    var vec2 = require('../core/vector');

    var points = [[], [], []];
    var mathSqrt = Math.sqrt;
    var mathAtan2 = Math.atan2;
    function transformPath(path, m) {
        var len = path.len();
        var data = path.data;
        var cmd;
        var nPoint;
        var i, j, k;

        var M = CMD.M;
        var C = CMD.C;
        var L = CMD.L;
        var Z = CMD.Z;
        var A = CMD.A;
        var Q = CMD.Q;

        for (i = 0, j = 0; i < data.length;) {
            cmd = data[i++];
            nPoint = 0;

            switch (cmd) {
                case M:
                    nPoint = 1;
                    break;
                case L:
                    nPoint = 1;
                    break;
                case C:
                    nPoint = 3;
                    break;
                case Q:
                    nPoint = 2;
                    break;
                case A:
                    nPoint = 0;
                    var x = m[4];
                    var y = m[5];
                    var sx = mathSqrt(m[0] * m[0] + m[1] * m[1]);
                    var sy = mathSqrt(m[2] * m[2] + m[3] * m[3]);
                    var angle = mathAtan2(-m[1] / sy, m[0] / sx);
                    var clockwise = d[i + 7];
                    // cx
                    d[i++] += x;
                    // cy
                    d[i++] += y;
                    // Scale rx and ry
                    // FIXME Assume psi is 0 here
                    d[i++] *= sx;
                    d[i++] *= sy;

                    // Start angle
                    d[i++] += angle;
                    // end angle
                    d[i++] += angle;
                    // FIXME psi
                    i += 2;
                    j = i;
                    break;
            }

            for (k = 0; k < nPoint; k++) {
                var p = points[k];
                p[0] = data[i++];
                p[1] = data[i++];

                vec2.applyTransform(p, p, m);
                // Write back
                data[j++] = p[0];
                data[j++] = p[1];
            }
        }
    }

    return transformPath;
});