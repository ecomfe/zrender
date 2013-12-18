/**
 * zrender: 公共辅助函数
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * clone：深度克隆
 * merge：合并源对象的属性到目标对象
 * getContext：获取一个自由使用的canvas 2D context，使用原生方法，如isPointInPath，measureText等
 */
define(
    function(require) {

        var vec2 = require('./vector');

        /**
         * 对一个object进行深度拷贝
         *
         * @param {Any} source 需要进行拷贝的对象
         * @return {Any} 拷贝后的新对象
         */
        function clone(source) {
            // buildInObject, 用于处理无法遍历Date等对象的问题
            var buildInObject = {
                '[object Function]': 1,
                '[object RegExp]': 1,
                '[object Date]': 1,
                '[object Error]': 1,
                '[object CanvasGradient]': 1
            };
            var result = source;
            var i;
            var len;
            if (!source
                || source instanceof Number
                || source instanceof String
                || source instanceof Boolean
            ) {
                return result;
            }
            else if (source instanceof Array) {
                result = [];
                var resultLen = 0;
                for (i = 0, len = source.length; i < len; i++) {
                    result[resultLen++] = this.clone(source[i]);
                }
            }
            else if ('object' == typeof source) {
                if(buildInObject[Object.prototype.toString.call(source)]
                   || source.__nonRecursion
                ) {
                    return result;
                }
                result = {};
                for (i in source) {
                    if (source.hasOwnProperty(i)) {
                        result[i] = this.clone(source[i]);
                    }
                }
            }
            return result;
        }

        /**
         * 合并源对象的属性到目标对象
         * modify from Tangram
         * @param {*} target 目标对象
         * @param {*} source 源对象
         * @param {Object} optOptions 选项
         * @param {boolean} optOptions.overwrite 是否覆盖
         * @param {boolean} optOptions.recursive 是否递归
         * @param {boolean} optOptions.whiteList 白名单，如果定义，则仅处理白名单属性
         */
        var merge = (function() {
            // buildInObject, 用于处理无法遍历Date等对象的问题
            var buildInObject = {
                '[object Function]': 1,
                '[object RegExp]': 1,
                '[object Date]': 1,
                '[object Error]': 1,
                '[object CanvasGradient]': 1
            };
            function mergeItem(target, source, index, overwrite, recursive) {
                if (source.hasOwnProperty(index)) {
                    if (recursive
                        && typeof target[index] == 'object'
                        && buildInObject[
                            Object.prototype.toString.call(target[index])
                        ] != 1
                    ) {
                        // 如果需要递归覆盖，就递归调用merge
                        merge(
                            target[index],
                            source[index],
                            {
                                'overwrite': overwrite,
                                'recursive': recursive
                            }
                        );
                    } else if (overwrite || !(index in target)) {
                        // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                        target[index] = source[index];
                    }
                }
            }

            return function(target, source, optOptions){
                var i = 0;
                var options = optOptions || {};
                var overwrite = options['overwrite'];
                var whiteList = options['whiteList'];
                var recursive = options['recursive'];
                var len;

                // 只处理在白名单中的属性
                if (whiteList && whiteList.length) {
                    len = whiteList.length;
                    for (; i < len; ++i) {
                        mergeItem(
                            target, source, whiteList[i], overwrite, recursive
                        );
                    }
                } else {
                    for (i in source) {
                        mergeItem(target, source, i, overwrite, recursive);
                    }
                }
                return target;
            };
        })();

        /**
         * 简化版的merge操作，舍去很多判断
         * @param  {*} target   
         * @param  {*} source   
         * @param  {boolean} overwrite
         * @param  {boolean} recursive     
         */
        function mergeFast(target, source, overwrite, recursive) {
            if (!target || !source) {
                return;
            }
            if (source instanceof Object) {
                for (var name in source) {
                    if (source.hasOwnProperty(name)) {
                        if (
                            source[name] instanceof Object 
                            && recursive
                            && target[name]
                        ) {
                            mergeFast(
                                target[name],
                                source[name],
                                overwrite,
                                recursive
                            );
                        } else {
                            if (
                                overwrite
                                || !target.hasOwnProperty(name)
                            ) {
                                target[name] = source[name];
                            }
                        }
                    }
                }
            }
        }

        var _ctx;

        function getContext() {
            if (!_ctx) {
                require('../lib/excanvas');
                if (G_vmlCanvasManager) {
                    var _div = document.createElement('div');
                    _div.style.position = 'absolute';
                    _div.style.top = '-1000px';
                    document.body.appendChild(_div);

                    _ctx = G_vmlCanvasManager.initElement(_div)
                               .getContext('2d');
                }
                else {
                    _ctx = document.createElement('canvas').getContext('2d');
                }
            }
            return _ctx;
        }

        var _canvas;
        var _pixelCtx;
        var _width;
        var _height;
        var _offsetX = 0;
        var _offsetY = 0;

        /**
         * 获取像素拾取专用的上下文
         * @return {Object} 上下文
         */
        function getPixelContext() {
            if (!_pixelCtx) {
                _canvas = document.createElement('canvas');
                _width = _canvas.width;
                _height = _canvas.height;
                _pixelCtx = _canvas.getContext('2d');
            }
            return _pixelCtx;
        }

        /**
         * 如果坐标处在_canvas外部，改变_canvas的大小
         * @param {number} x : 横坐标
         * @param {number} y : 纵坐标
         * 注意 修改canvas的大小 需要重新设置translate
         */
        function adjustCanvasSize(x, y) {
            // 每次加的长度
            var _v = 100;
            var _flag = false;

            if (x + _offsetX > _width) {
                _width = x + _offsetX + _v;
                _canvas.width = _width;
                _flag = true;
            }

            if (y + _offsetY > _height) {
                _height = y + _offsetY + _v;
                _canvas.height = _height;
                _flag = true;
            }

            if (x < -_offsetX) {
                _offsetX = Math.ceil(-x / _v) * _v;
                _width += _offsetX;
                _canvas.width = _width;
                _flag = true;
            }

            if (y < -_offsetY) {
                _offsetY = Math.ceil(-y / _v) * _v;
                _height += _offsetY;
                _canvas.height = _height;
                _flag = true;
            }

            if (_flag) {
                _pixelCtx.translate(_offsetX, _offsetY);
            }
        }

        /**
         * 获取像素canvas的偏移量
         * @return {Object} 偏移量
         */
        function getPixelOffset() {
            return {
                x : _offsetX,
                y : _offsetY
            };
        }

        /**
         * 查询数组中元素的index
         */
        function indexOf(array, value){
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for(var i = 0, len=array.length; i<len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * 计算包围盒
         */
        function computeBoundingBox(points, min, max) {
            if (points.length === 0) {
                return;
            }
            var left = points[0][0];
            var right = points[0][0];
            var top = points[0][1];
            var bottom = points[0][1];
            
            for (var i = 1; i < points.length; i++) {
                var p = points[i];
                if (p[0] < left) {
                    left = p[0];
                }
                if (p[0] > right) {
                    right = p[0];
                }
                if (p[1] < top) {
                    top = p[1];
                }
                if (p[1] > bottom) {
                    bottom = p[1];
                }
            }

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        /**
         * 计算三阶贝塞尔曲线的包围盒
         * http://pissang.net/blog/?p=91
         */
        function computeCubeBezierBoundingBox(p0, p1, p2, p3, min, max) {
            var xDim = _computeCubeBezierExtremitiesDim(
                p0[0], p1[0], p2[0], p3[0]
            );
            var yDim = _computeCubeBezierExtremitiesDim(
                p0[1], p1[1], p2[1], p3[1]
            );

            xDim.push(p0[0], p3[0]);
            yDim.push(p0[1], p3[1]);

            var left = Math.min.apply(null, xDim);
            var right = Math.max.apply(null, xDim);
            var top = Math.min.apply(null, yDim);
            var bottom = Math.max.apply(null, yDim);

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        function _computeCubeBezierExtremitiesDim(p0, p1, p2, p3) {
            var extremities = [];

            var b = 6 * p2 - 12 * p1 + 6 * p0;
            var a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
            var c = 3 * p1 - 3 * p0;

            var tmp = b * b - 4 * a * c;
            if (tmp > 0){
                var tmpSqrt = Math.sqrt(tmp);
                var t1 = (-b + tmpSqrt) / (2 * a);
                var t2 = (-b - tmpSqrt) / (2 * a);
                extremities.push(t1, t2);
            } else if (tmp === 0) {
                extremities.push(-b / (2 * a));
            }
            var result = [];
            for (var i = 0; i < extremities.length; i++) {
                var t = extremities[i];
                if (Math.abs(2 * a * t + b) > 0.0001 && t < 1 && t > 0) {
                    var ct = 1 - t;
                    var val = ct * ct * ct * p0 
                            + 3 * ct * ct * t * p1
                            + 3 * ct * t * t * p2
                            + t * t *t * p3;

                    result.push(val);
                }
            }

            return result;
        }

        /**
         * 计算二阶贝塞尔曲线的包围盒
         * http://pissang.net/blog/?p=91
         */
        function computeQuadraticBezierBoundingBox(p0, p1, p2, min, max) {
            // Find extremities, where derivative in x dim or y dim is zero
            var tmp = (p0[0] + p2[0] - 2 * p1[0]);
            // p1 is center of p0 and p2 in x dim
            var t1;
            if (tmp === 0) {
                t1 = 0.5;
            } else {
                t1 = (p0[0] - p1[0]) / tmp;
            }

            tmp = (p0[1] + p2[1] - 2 * p1[1]);
            // p1 is center of p0 and p2 in y dim
            var t2;
            if (tmp === 0) {
                t2 = 0.5;
            } else {
                t2 = (p0[1] - p1[1]) / tmp;
            }

            t1 = Math.max(Math.min(t1, 1), 0);
            t2 = Math.max(Math.min(t2, 1), 0);

            var ct1 = 1-t1;
            var ct2 = 1-t2;

            var x1 = ct1 * ct1 * p0[0] 
                     + 2 * ct1 * t1 * p1[0] 
                     + t1 * t1 * p2[0];
            var y1 = ct1 * ct1 * p0[1] 
                     + 2 * ct1 * t1 * p1[1] 
                     + t1 * t1 * p2[1];

            var x2 = ct2 * ct2 * p0[0] 
                     + 2 * ct2 * t2 * p1[0] 
                     + t2 * t2 * p2[0];
            var y2 = ct2 * ct2 * p0[1] 
                     + 2 * ct2 * t2 * p1[1] 
                     + t2 * t2 * p2[1];

            return computeBoundingBox(
                        [p0.slice(), p2.slice(), [x1, y1], [x2, y2]],
                        min, max
                    );
        }


        /**
         * 计算圆弧的包围盒
         * http://pissang.net/blog/?p=91
         */
        var computeArcBoundingBox = (function(){
            var start = [];
            var end = [];
            // At most 4 extremities
            var extremities = [[], [], [], []];
            return function(
                center, radius, startAngle, endAngle, clockwise, min, max
            ) {
                clockwise = clockwise ? 1 : -1;
                start[0] = Math.cos(startAngle);
                start[1] = Math.sin(startAngle) * clockwise;
                vec2.scale(start, start, radius);
                vec2.add(start, start, center);

                end[0] = Math.cos(endAngle);
                end[1] = Math.sin(endAngle) * clockwise;
                vec2.scale(end, end, radius);
                vec2.add(end, end, center);
                
                startAngle = startAngle % (Math.PI * 2);
                if (startAngle < 0) {
                    startAngle = startAngle + Math.PI * 2;
                }
                endAngle = endAngle % (Math.PI * 2);
                if (endAngle < 0) {
                    endAngle = endAngle + Math.PI * 2;
                }

                if (startAngle > endAngle) {
                    endAngle += Math.PI * 2;
                }
                var number = 0;
                for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
                    if (angle > startAngle) {
                        var extremity = extremities[number++];
                        extremity[0] = Math.cos(angle);
                        extremity[1] = Math.sin(angle) * clockwise;
                        vec2.scale(extremity, extremity, radius);
                        vec2.add(extremity, extremity, center);
                    }
                }
                var points = extremities.slice(0, number);
                points.push(start, end);
                computeBoundingBox(points, min, max);
            };
        })();

        return {
            clone : clone,
            merge : merge,
            mergeFast : mergeFast,
            getContext : getContext,

            getPixelContext : getPixelContext,
            getPixelOffset : getPixelOffset,
            adjustCanvasSize : adjustCanvasSize,

            computeBoundingBox : computeBoundingBox,
            computeCubeBezierBoundingBox : computeCubeBezierBoundingBox,
            computeQuadraticBezierBoundingBox : 
                computeQuadraticBezierBoundingBox,
            computeArcBoundingBox : computeArcBoundingBox,

            indexOf : indexOf
        };
    }
);