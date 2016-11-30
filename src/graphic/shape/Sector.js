/**
 * 扇形
 * @module zrender/graphic/shape/Sector
 */

define(function (require) {

    var env = require('../../core/env');
    var Path = require('../Path');

    var shadowTemp = [
        ['shadowBlur', 0],
        ['shadowColor', '#000'],
        ['shadowOffsetX', 0],
        ['shadowOffsetY', 0]
    ];

    return Path.extend({

        type: 'sector',

        shape: {

            cx: 0,

            cy: 0,

            r0: 0,

            r: 0,

            startAngle: 0,

            endAngle: Math.PI * 2,

            clockwise: true
        },

        brush: (env.browser.ie && env.browser.version >= 11) // version: '11.0'
            // Fix weird bug in some version of IE11 (like 11.0.9600.17801),
            // where exception "unexpected call to method or property access"
            // might be thrown when calling ctx.fill after a path whose area size
            // is zero is drawn and ctx.clip() is called and shadowBlur is set.
            // (e.g.,
            //  ctx.moveTo(10, 10);
            //  ctx.lineTo(20, 10);
            //  ctx.closePath();
            //  ctx.clip();
            //  ctx.shadowBlur = 10;
            //  ...
            //  ctx.fill();
            // )
            ? function () {
                var clipPaths = this.__clipPaths;
                var style = this.style;
                var modified;

                if (clipPaths) {
                    for (var i = 0; i < clipPaths.length; i++) {
                        var shape = clipPaths[i] && clipPaths[i].shape;
                        if (shape && shape.startAngle === shape.endAngle) {
                            for (var j = 0; j < shadowTemp.length; j++) {
                                shadowTemp[j][2] = style[shadowTemp[j][0]];
                                style[shadowTemp[j][0]] = shadowTemp[j][1];
                            }
                            modified = true;
                            break;
                        }
                    }
                }

                Path.prototype.brush.apply(this, arguments);

                if (modified) {
                    for (var j = 0; j < shadowTemp.length; j++) {
                        style[shadowTemp[j][0]] = shadowTemp[j][2];
                    }
                }
            }
            : Path.prototype.brush,

        buildPath: function (ctx, shape) {

            var x = shape.cx;
            var y = shape.cy;
            var r0 = Math.max(shape.r0 || 0, 0);
            var r = Math.max(shape.r, 0);
            var startAngle = shape.startAngle;
            var endAngle = shape.endAngle;
            var clockwise = shape.clockwise;

            var unitX = Math.cos(startAngle);
            var unitY = Math.sin(startAngle);

            ctx.moveTo(unitX * r0 + x, unitY * r0 + y);

            ctx.lineTo(unitX * r + x, unitY * r + y);

            ctx.arc(x, y, r, startAngle, endAngle, !clockwise);

            ctx.lineTo(
                Math.cos(endAngle) * r0 + x,
                Math.sin(endAngle) * r0 + y
            );

            if (r0 !== 0) {
                ctx.arc(x, y, r0, endAngle, startAngle, clockwise);
            }

            ctx.closePath();
        }
    });
});
