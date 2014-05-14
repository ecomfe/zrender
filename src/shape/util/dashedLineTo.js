/**
 * 虚线lineTo 
 *
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *          errorrik (errorrik@gmail.com)
 */

define(
    function (/* require */) {
        /**
         * 虚线lineTo 
         */
        return function (ctx, x1, y1, x2, y2, dashLength) {
            dashLength = typeof dashLength != 'number'
                            ? 5 
                            : dashLength;

            var deltaX = x2 - x1;
            var deltaY = y2 - y1;
            var numDashes = Math.floor(
                Math.sqrt(deltaX * deltaX + deltaY * deltaY) / dashLength
            );

            for (var i = 0; i < numDashes; ++i) {
                ctx[i % 2 ? 'lineTo' : 'moveTo'](
                    x1 + (deltaX / numDashes) * i,
                    y1 + (deltaY / numDashes) * i
                );
            }
            ctx.lineTo(x2, y2);
        };
    }
);
