/**
 * zrender: 公共辅助函数
 *
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *
 * clone：深度克隆
 * merge：合并源对象的属性到目标对象
 * getContext：获取一个自由使用的canvas 2D context，使用原生方法，如isPointInPath，measureText等
 */
define(
    function(require) {
        // 用于处理merge时无法遍历Date等对象的问题
        var BUILTIN_OBJECT = {
            '[object Function]': 1,
            '[object RegExp]': 1,
            '[object Date]': 1,
            '[object Error]': 1,
            '[object CanvasGradient]': 1
        };

        var objToString = Object.prototype.toString;

        function isDom(obj) {
            return obj && obj.nodeType === 1
                   && typeof(obj.nodeName) == 'string';
        }

        /**
         * 对一个object进行深度拷贝
         *
         * @param {Any} source 需要进行拷贝的对象
         * @return {Any} 拷贝后的新对象
         */
        function clone(source) {
            if (typeof source == 'object' && source !== null) {
                var result = source;
                if (source instanceof Array) {
                    result = [];
                    for (var i = 0, len = source.length; i < len; i++) {
                        result[i] = clone(source[i]);
                    }
                }
                else if (
                    !BUILTIN_OBJECT[objToString.call(source)]
                    // 是否为 dom 对象
                    && !isDom(source)
                ) {
                    result = {};
                    for (var key in source) {
                        if (source.hasOwnProperty(key)) {
                            result[key] = clone(source[key]);
                        }
                    }
                }

                return result;
            }

            return source;
        }

        function mergeItem(target, source, key, overwrite) {
            if (source.hasOwnProperty(key)) {
                var targetProp = target[key];
                if (typeof targetProp == 'object'
                    && !BUILTIN_OBJECT[objToString.call(targetProp)]
                    // 是否为 dom 对象
                    && !isDom(targetProp)
                ) {
                    // 如果需要递归覆盖，就递归调用merge
                    merge(
                        target[key],
                        source[key],
                        overwrite
                    );
                }
                else if (overwrite || !(key in target)) {
                    // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                    target[key] = source[key];
                }
            }
        }

        /**
         * 合并源对象的属性到目标对象
         * modify from Tangram
         * @param {*} target 目标对象
         * @param {*} source 源对象
         * @param {boolean} overwrite 是否覆盖
         */
        function merge(target, source, overwrite) {
            for (var i in source) {
                mergeItem(target, source, i, overwrite);
            }
            
            return target;
        }

        var _ctx;

        function getContext() {
            if (!_ctx) {
                require('../dep/excanvas');
                /* jshint ignore:start */
                if (window['G_vmlCanvasManager']) {
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
                /* jshint ignore:end */
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
            var _flag;

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
        function indexOf(array, value) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * 构造类继承关系
         * 
         * @param {Function} clazz 源类
         * @param {Function} baseClazz 基类
         */
        function inherits(clazz, baseClazz) {
            var clazzPrototype = clazz.prototype;
            function F() {}
            F.prototype = baseClazz.prototype;
            clazz.prototype = new F();

            for (var prop in clazzPrototype) {
                clazz.prototype[prop] = clazzPrototype[prop];
            }
            clazz.constructor = clazz;
        }

        return {
            inherits: inherits,
            clone : clone,
            merge : merge,
            getContext : getContext,
            getPixelContext : getPixelContext,
            getPixelOffset : getPixelOffset,
            adjustCanvasSize : adjustCanvasSize,
            indexOf : indexOf
        };
    }
);
