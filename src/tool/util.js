/**
 * zrender: 公共辅助函数
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * clone：深度克隆
 * merge：合并源对象的属性到目标对象
 * getContext：获取一个自由使用的canvas 2D context，使用原生方法，如isPointInPath，measureText等
 */
define(
    function(require) {
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
                if(buildInObject[Object.prototype.toString.call(source)]) {
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
            function mergeItem(target, source, index, overwrite, recursive) {
                if (source.hasOwnProperty(index)) {
                    if (recursive
                        && typeof target[index] == 'object'
                        && typeof target[index] != 'function'
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
                var i = 0,
                    options = optOptions || {},
                    overwrite = options['overwrite'],
                    whiteList = options['whiteList'],
                    recursive = options['recursive'],
                    len;

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

        var _ctx;

        function getContext() {
            require('js!../lib/excanvas.js');
            if (!_ctx) {
                if (!document.createElement('canvas').getContext
                    && G_vmlCanvasManager
                ) {
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

        return {
            clone : clone,
            merge : merge,
            getContext : getContext,

            getPixelContext : getPixelContext,
            getPixelOffset : getPixelOffset,
            adjustCanvasSize : adjustCanvasSize
        };
    }
);