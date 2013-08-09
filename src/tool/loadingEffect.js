/**
 * zrender: loading特效
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * 扩展loading effect：
 * getBackgroundShape：获取背景图形
 * getTextShape：获取文字
 * define : 定义效果
 *
 * 内置效果
 * bar：进度条
 * whirling：旋转水滴
 * dynamicLine：动态线条
 * bubble：气泡
 */
define(
    function(require) {
        var util = require('./util');
        var self;
        var _defaultText = 'Loading...';
        var _defaultTextFont = 'normal 16px Arial';

        var _width;
        var _height;

        function define(name, fun) {
            self[name] = fun;
        }

        /**
         * 获取loading文字图形
         * @param {Object} textStyle 文字style，同shape/text.style
         */
        function getTextShape(textStyle) {
            return {
                shape : 'text',
                highlightStyle : util.merge(
                    {
                        x : _width / 2,
                        y : _height / 2,
                        text : _defaultText,
                        textAlign : 'center',
                        textBaseline : 'middle',
                        textFont : _defaultTextFont,
                        color: '#333',
                        brushType : 'fill'
                    },
                    textStyle,
                    {'overwrite': true, 'recursive': true}
                )
            };
        }

        /**
         * 获取loading背景图形
         * @param {color} color 背景颜色
         */
        function getBackgroundShape (color) {
            return {
                shape : 'rectangle',
                highlightStyle : {
                    x : 0,
                    y : 0,
                    width : _width,
                    height : _height,
                    brushType : 'fill',
                    color : color
                }
            };
        }

        // 调整值区间
        function _adjust(value, region) {
            if (value <= region[0]) {
                value = region[0];
            }
            else if (value >= region[1]) {
                value = region[1];
            }
            return value;
        }

        /**
         * 进度条
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function bar(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#888'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effectOption : {
                        x : 0,
                        y : _height / 2 - 30,
                        width : _width,
                        height : 5,
                        brushType : 'fill',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var effectOption = loadingOption.effectOption;
            // 初始化动画元素
            var barShape = {
                shape : 'rectangle',
                highlightStyle : util.clone(effectOption)
            };
            barShape.highlightStyle.color =
                effectOption.color
                || zrColor.getLinearGradient(
                    effectOption.x,
                    effectOption.y,
                    effectOption.x + effectOption.width,
                    effectOption.y + effectOption.height,
                    [[0, '#ff6400'], [0.5, '#ffe100'], [1, '#b1ff00']]
                );

            if (typeof loadingOption.progress != 'undefined') {
                // 指定进度
                addShapeHandle(background);

                barShape.highlightStyle.width =
                    _adjust(loadingOption.progress, [0,1])
                    * loadingOption.effectOption.width;
                addShapeHandle(barShape);

                addShapeHandle(textShape);

                refreshHandle();
                return;
            }
            else {
                // 循环显示
                barShape.highlightStyle.width = 0;
                return setInterval(
                    function() {
                        addShapeHandle(background);

                        if (barShape.highlightStyle.width
                            < loadingOption.effectOption.width
                        ) {
                            barShape.highlightStyle.width += 8;
                        }
                        else {
                            barShape.highlightStyle.width = 0;
                        }
                        addShapeHandle(barShape);

                        addShapeHandle(textShape);
                        refreshHandle();
                    },
                    effectOption.timeInterval
                );
            }
        }

        /**
         * 旋转水滴
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function whirling(loadingOption, addShapeHandle, refreshHandle) {
            // 特效默认配置
            loadingOption.effectOption = util.merge(
                loadingOption.effectOption || {},
                {
                    x : _width / 2 - 80,
                    y : _height / 2,
                    r : 18,
                    colorIn : '#fff',
                    colorOut : '#555',
                    colorWhirl : '#6cf',
                    timeInterval : 50
                }
            );

            var effectOption = loadingOption.effectOption;
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#888',
                        x : effectOption.x + effectOption.r + 10,
                        y : effectOption.y,
                        textAlign : 'start'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)'
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            // 初始化动画元素
            var droplet = {
                shape : 'droplet',
                highlightStyle : {
                    a : Math.round(effectOption.r / 2),
                    b : Math.round(effectOption.r - effectOption.r / 6),
                    brushType : 'fill',
                    color : effectOption.colorWhirl
                }
            };
            var circleIn = {
                shape : 'circle',
                highlightStyle : {
                    r : Math.round(effectOption.r / 6),
                    brushType : 'fill',
                    color : effectOption.colorIn
                }
            };
            var circleOut = {
                shape : 'ring',
                highlightStyle : {
                    r0 : Math.round(effectOption.r - effectOption.r / 3),
                    r : effectOption.r,
                    brushType : 'fill',
                    color : effectOption.colorOut
                }
            };

            var pos = [0, effectOption.x, effectOption.y];

            droplet.highlightStyle.x
                = circleIn.highlightStyle.x
                = circleOut.highlightStyle.x
                = pos[1];
            droplet.highlightStyle.y
                = circleIn.highlightStyle.y
                = circleOut.highlightStyle.y
                = pos[2];

            return setInterval(
                function() {
                    addShapeHandle(background);
                    addShapeHandle(circleOut);
                    pos[0] -= 0.3;
                    droplet.rotation = pos;
                    addShapeHandle(droplet);
                    addShapeHandle(circleIn);
                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        }

        /**
         * 动态线
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function dynamicLine(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#fff'
                    },
                    backgroundColor : 'rgba(0, 0, 0, 0.8)',
                    effectOption : {
                        n : 30,
                        lineWidth : 1,
                        color : 'random',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var effectOption = loadingOption.effectOption;
            var n = effectOption.n;
            var lineWidth = effectOption.lineWidth;

            var shapeList = [];
            var pos;
            var len;
            var xStart;
            var color;
            // 初始化动画元素
            for(var i = 0; i < n; i++) {
                xStart = -Math.ceil(Math.random() * 1000);
                len = Math.ceil(Math.random() * 400);
                pos = Math.ceil(Math.random() * _height);

                if (effectOption.color == 'random') {
                    color = zrColor.random();
                }
                else {
                    color = effectOption.color;
                }
                shapeList[i] = {
                    shape : 'line',
                    highlightStyle : {
                        xStart : xStart,
                        yStart : pos,
                        xEnd : xStart + len,
                        yEnd : pos,
                        strokeColor : color,
                        lineWidth : lineWidth
                    },
                    animationX : Math.ceil(Math.random() * 100),
                    len : len
                };
            }

            return setInterval(
                function() {
                    addShapeHandle(background);
                    var style;
                    for(var i = 0; i < n; i++) {
                        style = shapeList[i].highlightStyle ;

                        if (style.xStart >= _width){
                            shapeList[i].len = Math.ceil(Math.random() * 400);
                            shapeList[i].highlightStyle .xStart = -400;
                            shapeList[i].highlightStyle .xEnd =
                                -400 + shapeList[i].len;
                            shapeList[i].highlightStyle .yStart =
                                Math.ceil(Math.random() * _height);
                            shapeList[i].highlightStyle .yEnd =
                                shapeList[i].highlightStyle.yStart;
                        }
                        shapeList[i].highlightStyle.xStart +=
                            shapeList[i].animationX;
                        shapeList[i].highlightStyle.xEnd +=
                            shapeList[i].animationX;

                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        }

        /**
         * 泡泡
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function bubble(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#888'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effectOption : {
                        n : 50,
                        lineWidth : 2,
                        brushType : 'stroke',
                        color : 'random',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var effectOption = loadingOption.effectOption;
            var n = effectOption.n;
            var brushType = effectOption.brushType;
            var lineWidth = effectOption.lineWidth;

            var shapeList = [];
            var color;
            // 初始化动画元素
            for(var i = 0; i < n; i++) {
                if (effectOption.color == 'random') {
                    color = zrColor.alpha(zrColor.random(), 0.3);
                }
                else {
                    color = effectOption.color;
                }
                shapeList[i] = {
                    shape : 'circle',
                    highlightStyle : {
                        x : Math.ceil(Math.random() * _width),
                        y : Math.ceil(Math.random() * _height),
                        r : Math.ceil(Math.random() * 40),
                        brushType : brushType,
                        color : color,
                        strokeColor : color,
                        lineWidth : lineWidth
                    },
                    animationY : Math.ceil(Math.random() * 20)
                };
            }

            return setInterval(
                function () {
                    addShapeHandle(background);
                    var style;
                    for(var i = 0; i < n; i++) {
                        style = shapeList[i].highlightStyle;

                        if (style.y - shapeList[i].animationY + style.r <= 0){
                            shapeList[i].highlightStyle.y = _height + style.r;
                            shapeList[i].highlightStyle.x = Math.ceil(
                                Math.random() * _width
                            );
                        }
                        shapeList[i].highlightStyle.y -=
                            shapeList[i].animationY;

                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        }

        /**
         * 旋转
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function spin(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption.effectOption = util.merge(
                loadingOption.effectOption || {},
                {
                    x : _width / 2 - 80,
                    y : _height / 2,
                    r0 : 9,
                    r : 15,
                    n : 18,
                    color : '#fff',
                    timeInterval : 100
                }
            );

            var effectOption = loadingOption.effectOption;
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#fff',
                        x : effectOption.x + effectOption.r + 10,
                        y : effectOption.y,
                        textAlign : 'start'
                    },
                    backgroundColor : 'rgba(0, 0, 0, 0.8)'
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

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
                shapeList[i] = {
                    shape : 'sector',
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
                };
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
        }


        /**
         * 圆环
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function ring(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            var zrMath = require('./math');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#07a'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effectOption : {
                        x : _width / 2,
                        y : _height / 2,
                        r0 : 60,
                        r : 100,
                        color : '#bbdcff',
                        brushType: 'fill',
                        textPosition : 'inside',
                        textFont : 'normal 30px verdana',
                        textColor : 'rgba(30, 144, 255, 0.6)',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var effectOption = loadingOption.effectOption;
            var textStyle = loadingOption.textStyle;
            textStyle.x = typeof textStyle.x != 'undefined'
                ? textStyle.x : effectOption.x;
            textStyle.y = typeof textStyle.y != 'undefined'
                ? textStyle.y
                : (effectOption.y + (effectOption.r0 + effectOption.r) / 2 - 5);
            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var x = effectOption.x;
            var y = effectOption.y;
            var r0 = effectOption.r0 + 6;
            var r = effectOption.r - 6;
            var color = effectOption.color;
            var darkColor = zrColor.lift(color, 0.1);

            var shapeRing = {
                shape : 'ring',
                highlightStyle : util.clone(effectOption)
            };
            // 初始化动画元素
            var shapeList = [];
            var clolrList = zrColor.getGradientColors(
                ['#ff6400', '#ffe100', '#97ff00'], 25
            );
            var preAngle = 15;
            var endAngle = 240;

            for(var i = 0; i < 16; i++) {
                shapeList.push({
                    shape : 'sector',
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : endAngle - preAngle,
                        endAngle : endAngle,
                        brushType: 'fill',
                        color : darkColor
                    },
                    _color : zrColor.getLinearGradient(
                        x + r0 * zrMath.cos(endAngle, true),
                        y - r0 * zrMath.sin(endAngle, true),
                        x + r0 * zrMath.cos(endAngle - preAngle, true),
                        y - r0 * zrMath.sin(endAngle - preAngle, true),
                        [
                            [0, clolrList[i * 2]],
                            [1, clolrList[i * 2 + 1]]
                        ]
                    )
                });
                endAngle -= preAngle;
            }
            endAngle = 360;
            for(var i = 0; i < 4; i++) {
                shapeList.push({
                    shape : 'sector',
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : endAngle - preAngle,
                        endAngle : endAngle,
                        brushType: 'fill',
                        color : darkColor
                    },
                    _color : zrColor.getLinearGradient(
                        x + r0 * zrMath.cos(endAngle, true),
                        y - r0 * zrMath.sin(endAngle, true),
                        x + r0 * zrMath.cos(endAngle - preAngle, true),
                        y - r0 * zrMath.sin(endAngle - preAngle, true),
                        [
                            [0, clolrList[i * 2 + 32]],
                            [1, clolrList[i * 2 + 33]]
                        ]
                    )
                });
                endAngle -= preAngle;
            }

            var n = 0;
            if (typeof loadingOption.progress != 'undefined') {
                // 指定进度
                addShapeHandle(background);

                n = _adjust(loadingOption.progress, [0,1]).toFixed(2) * 100 / 5;
                shapeRing.highlightStyle.text = n * 5 + '%';
                addShapeHandle(shapeRing);

                for(var i = 0; i < 20; i++) {
                    shapeList[i].highlightStyle.color = i < n
                        ? shapeList[i]._color : darkColor;
                    addShapeHandle(shapeList[i]);
                }

                addShapeHandle(textShape);

                refreshHandle();
                return;
            }
            else {
                // 循环显示
                return setInterval(
                    function() {
                        addShapeHandle(background);

                        n += n >= 20 ? -20 : 1;

                        //shapeRing.highlightStyle.text = n * 5 + '%';
                        addShapeHandle(shapeRing);

                        for(var i = 0; i < 20; i++) {
                            shapeList[i].highlightStyle.color = i < n
                                ? shapeList[i]._color : darkColor;
                            addShapeHandle(shapeList[i]);
                        }

                        addShapeHandle(textShape);
                        refreshHandle();
                    },
                    effectOption.timeInterval
                );
            }
        }

        function start(loadingOption, addShapeHandle, refreshHandle) {
            var loadingEffect = self.ring;   // 默认特效
            if (typeof loadingOption.effect == 'function') {
                // 自定义特效
                loadingEffect = loadingOption.effect;
            }
            else if (typeof self[loadingOption.effect] == 'function'){
                // 指定特效
                loadingEffect = self[loadingOption.effect];
            }

            _width = loadingOption.canvasSize.width;
            _height = loadingOption.canvasSize.height;

            return loadingEffect(
                loadingOption, addShapeHandle, refreshHandle
            );
        }

        function stop(loadingTimer) {
            clearInterval(loadingTimer);
        }

        self = {
            // 这三个方法用于扩展loading effect
            getBackgroundShape : getBackgroundShape,
            getTextShape : getTextShape,
            define : define,
            // 内置特效
            bar : bar,
            whirling : whirling,
            dynamicLine : dynamicLine,
            bubble : bubble,
            spin : spin,
            ring : ring,
            // 方法
            start : start,
            stop : stop
        };

        return self;
    }
);