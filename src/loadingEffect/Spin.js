
define(
    function (require) {
        var Base = require('./Base');
        var util = require('../tool/util');
        var zrColor = require('../tool/color');
        var SectorShape = require('../shape/Sector');

        function Spin(options) {
            Base.call(this, options);
        }
        util.inherits(Spin, Base);

        /**
         * 旋转
         * 
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        Spin.prototype._start = function (addShapeHandle, refreshHandle) {
            // 特效默认配置
            var effectOption =  util.merge(
                this.options.effect || {},
                {
                    x : this.canvasWidth / 2 - 80,
                    y : this.canvasHeight / 2,
                    r0 : 9,
                    r : 15,
                    n : 18,
                    color : '#fff',
                    timeInterval : 100
                }
            );

            var options = util.merge(
                this.options,
                {
                    textStyle : {
                        color : '#fff',
                        x : effectOption.x + effectOption.r + 10,
                        y : effectOption.y,
                        textAlign : 'start'
                    },
                    backgroundColor : 'rgba(0, 0, 0, 0.8)'
                }
            );

            var textShape = this.createTextShape(options.textStyle);
            var background = this.createBackgroundShape(options.backgroundColor);

            var n = effectOption.n;
            var x = effectOption.x;
            var y = effectOption.y;
            var r0 = effectOption.r0;
            var r = effectOption.r;
            var color = effectOption.color;

            // 初始化动画元素
            var shapeList = [];
            var preAngle = Math.round(180 / n);
            for(var i = 0; i < n; i++) {
                shapeList[i] = new SectorShape({
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : preAngle * i * 2,
                        endAngle : preAngle * i * 2 + preAngle,
                        color : zrColor.alpha(color, (i + 1) / n),
                        brushType: 'fill'
                    }
                });
            }

            var pos = [0, x, y];

            return setInterval(
                function() {
                    addShapeHandle(background);
                    pos[0] -= 0.3;
                    for(var i = 0; i < n; i++) {
                        shapeList[i].rotation = pos;
                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        };

        return Spin;
    }
);
