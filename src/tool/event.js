/**
 * 事件辅助类
 * @module zrender/tool/event
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 */
define(
    function() {

        'use strict';

        /**
        * 提取鼠标（手指）x坐标
        * @memberOf module:zrender/tool/event
        * @param  {Event} e 事件.
        * @return {number} 鼠标（手指）x坐标.
        */
        function getX(e) {
            return typeof e.zrenderX != 'undefined' && e.zrenderX
                   || typeof e.offsetX != 'undefined' && e.offsetX
                   || typeof e.layerX != 'undefined' && e.layerX
                   || typeof e.clientX != 'undefined' && e.clientX;
        }

        /**
        * 提取鼠标y坐标
        * @memberOf module:zrender/tool/event
        * @param  {Event} e 事件.
        * @return {number} 鼠标（手指）y坐标.
        */
        function getY(e) {
            return typeof e.zrenderY != 'undefined' && e.zrenderY
                   || typeof e.offsetY != 'undefined' && e.offsetY
                   || typeof e.layerY != 'undefined' && e.layerY
                   || typeof e.clientY != 'undefined' && e.clientY;
        }

        /**
        * 提取鼠标滚轮变化
        * @memberOf module:zrender/tool/event
        * @param  {Event} e 事件.
        * @return {number} 滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动
        */
        function getDelta(e) {
            return typeof e.wheelDelta != 'undefined' && e.wheelDelta
                   || typeof e.detail != 'undefined' && -e.detail;
        }

        /**
         * 停止冒泡和阻止默认行为
         * @memberOf module:zrender/tool/event
         * @method
         * @param {Event} e : event对象
         */
        var stop = typeof window.addEventListener === 'function'
            ? function (e) {
                e.preventDefault();
                e.stopPropagation();
                e.cancelBubble = true;
            }
            : function (e) {
                e.returnValue = false;
                e.cancelBubble = true;
            };

        /**
         * 事件分发器
         * @alias module:zrender/tool/event.Dispatcher
         * @constructor
         */
        var Dispatcher = function() {
            this._handlers = {};
        }
        /**
         * 单次触发绑定，dispatch后销毁
         * 
         * @param {string} event 事件名
         * @param {Function} handler 响应函数
         * @param {} [context]
         */
        Dispatcher.prototype.one = function(event, handler, context) {
            var _h = this._handlers;

            if(!handler || !event) {
                return this;
            }

            if(!_h[event]) {
                _h[event] = [];
            }

            _h[event].push({
                h : handler,
                one : true,
                ctx: context || this
            });

            return this;
        };

        /**
         * 绑定事件
         * @param {string} event 事件名
         * @param {Function} handler 事件处理函数
         * @param {} [context]
         */
        Dispatcher.prototype.bind = function(event, handler, context) {
            var _h = this._handlers;

            if(!handler || !event) {
                return this;
            }

            if(!_h[event]) {
                _h[event] = [];
            }

            _h[event].push({
                h : handler,
                one : false,
                ctx: context || this
            });

            return this;
        };

        /**
         * 解绑事件
         * @param {string} event 事件名
         * @param {Function} [handler] 事件处理函数
         */
        Dispatcher.prototype.unbind = function(event, handler) {
            var _h = this._handlers;

            if(!event) {
                this._handlers = {};
                return this;
            }

            if(handler) {
                if(_h[event]) {
                    var newList = [];
                    for (var i = 0, l = _h[event].length; i < l; i++) {
                        if (_h[event][i]['h'] != handler) {
                            newList.push(_h[event][i]);
                        }
                    }
                    _h[event] = newList;
                }

                if(_h[event] && _h[event].length === 0) {
                    delete _h[event];
                }
            }
            else {
                delete _h[event];
            }

            return this;
        };

        /**
         * 事件分发
         * 
         * @param {string} type 事件类型
         */
        Dispatcher.prototype.dispatch = function(type) {
            if(this._handlers[type]) {
                var args = arguments;
                var argLen = args.length;
    
                if (argLen > 3) {
                    args = Array.prototype.slice.call(args, 1);
                }
                
                var _h = this._handlers[type];
                var len = _h.length;
                for (var i = 0; i < len;) {
                    // Optimize advise from backbone
                    switch (argLen) {
                        case 1:
                            _h[i]['h'].call(_h[i]['ctx']);
                            break;
                        case 2:
                            _h[i]['h'].call(_h[i]['ctx'], args[1]);
                            break;
                        case 3:
                            _h[i]['h'].call(_h[i]['ctx'], args[1], args[2]);
                            break;
                        default:
                            // have more than 2 given arguments
                            _h[i]['h'].apply(_h[i]['ctx'], args);
                            break;
                    }
                    
                    if (_h[i]['one']) {
                        _h.splice(i, 1);
                        len--;
                    } else {
                        i++;
                    }
                }
            }

            return this;
        };

        /**
         * 带有context的事件分发, 最后一个参数是事件回调的context
         * @param {string} type 事件类型
         */
        Dispatcher.prototype.dispatchWithContext = function(type) {
            if(this._handlers[type]) {
                var args = arguments;
                var argLen = args.length;

                if (argLen > 4) {
                    args = Array.prototype.slice.call(args, 1, args.length - 1);
                }
                var ctx = args[args.length - 1];

                var _h = this._handlers[type];
                var len = _h.length;
                for (var i = 0; i < len;) {
                    // Optimize advise from backbone
                    switch (argLen) {
                        case 1:
                            _h[i]['h'].call(ctx);
                            break;
                        case 2:
                            _h[i]['h'].call(ctx, args[1]);
                            break;
                        case 3:
                            _h[i]['h'].call(ctx, args[1], args[2]);
                            break;
                        default:
                            // have more than 2 given arguments
                            _h[i]['h'].apply(ctx, args);
                            break;
                    }
                    
                    if (_h[i]['one']) {
                        _h.splice(i, 1);
                        len--;
                    } else {
                        i++;
                    }
                }
            }

            return this;
        };

        // 对象可以通过 onxxxx 绑定事件
        /**
         * @name module:zrender/tool/event.Dispatcher#onclick
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#onmouseover
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#onmouseout
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#onmousemove
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#onmousewheel
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#onmousedown
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#onmouseup
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#ondragstart
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#ondragend
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#ondragenter
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#ondragleave
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#ondragover
         * @type {Function}
         * @default null
         */
        /**
         * @name module:zrender/tool/event.Dispatcher#ondrop
         * @type {Function}
         * @default null
         */
        
        return {
            getX : getX,
            getY : getY,
            getDelta : getDelta,
            stop : stop,
            Dispatcher : Dispatcher
        };
    }
);
