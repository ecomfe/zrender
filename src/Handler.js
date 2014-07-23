/**
 * Handler控制模块
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         errorrik (errorrik@gmail.com)
 */

define(
    function (require) {

        'use strict';

        var config = require('./config');
        var env = require('./tool/env');
        var eventTool = require('./tool/event');
        var util = require('./tool/util');
        var EVENT = config.EVENT;

        var domHandlerNames = [
            'resize', 'click', 
            'mousewheel', 'mousemove', 'mouseout', 'mouseup', 'mousedown',
            'touchstart', 'touchend', 'touchmove'
        ];

        var domHandlers = {
            /**
             * 窗口大小改变响应函数
             * 
             * @param {event} event dom事件对象
             */
            resize: function (event) {
                event = event || window.event;
                this._lastHover = null;
                this._isMouseDown = 0;
                
                // 分发config.EVENT.RESIZE事件，global
                this.dispatch(EVENT.RESIZE, event);
            },

            /**
             * 点击响应函数
             * 
             * @param {event} event dom事件对象
             */
            click: function (event) {
                event = this._zrenderEventFixed(event);

                //分发config.EVENT.CLICK事件
                var _lastHover = this._lastHover;
                if (( _lastHover && _lastHover.clickable )
                    || !_lastHover
                ) {
                    this._dispatchAgency(_lastHover, EVENT.CLICK, event);
                }

                this._mousemoveHandler(event);
            },

            /**
             * 鼠标滚轮响应函数
             * 
             * @param {event} event dom事件对象
             */
            mousewheel: function (event) {
                event = this._zrenderEventFixed(event);

                //分发config.EVENT.MOUSEWHEEL事件
                this._dispatchAgency(this._lastHover, EVENT.MOUSEWHEEL, event);
                this._mousemoveHandler(event);
            },

            /**
             * 鼠标（手指）移动响应函数
             * 
             * @param {event} event dom事件对象
             */
            mousemove: function (event) {
                if (this.painter.isLoading()) {
                    return;
                }

                event = this._zrenderEventFixed(event);
                this._lastX = this._mouseX;
                this._lastY = this._mouseY;
                this._mouseX = eventTool.getX(event);
                this._mouseY = eventTool.getY(event);

                // 可能出现config.EVENT.DRAGSTART事件
                // 避免手抖点击误认为拖拽
                //if (this._mouseX - this._lastX > 1 || this._mouseY - this._lastY > 1) {
                    this._processDragStart(event);
                //}
                this._hasfound = 0;
                this._event = event;
                this.storage.iterShape(this._findHover, { normal: 'down'});

                // 找到的在迭代函数里做了处理，没找到得在迭代完后处理
                if (!this._hasfound) {
                    // 过滤首次拖拽产生的mouseout和dragLeave
                    if (!this._draggingTarget
                        || (this._lastHover && this._lastHover != this._draggingTarget)
                    ) {
                        // 可能出现config.EVENT.MOUSEOUT事件
                        this._processOutShape(event);

                        // 可能出现config.EVENT.DRAGLEAVE事件
                        this._processDragLeave(event);
                    }

                    this._lastHover = null;
                    this.storage.delHover();
                    this.painter.clearHover();
                }
                //如果存在拖拽中元素，被拖拽的图形元素最后addHover
                if (this._draggingTarget) {
                    this.storage.drift(
                        this._draggingTarget.id,
                        this._mouseX - this._lastX,
                        this._mouseY - this._lastY
                    );
                    this.storage.addHover(this._draggingTarget);
                }

                // set cursor for root element
                var cursor = 'default';
                if (this._draggingTarget || (this._hasfound && this._lastHover.draggable)) {
                    cursor = 'move';
                }
                else if (this._hasfound && this._lastHover.clickable) {
                    cursor = 'pointer';
                }
                this.root.style.cursor = cursor;

                // 分发config.EVENT.MOUSEMOVE事件
                this._dispatchAgency(this._lastHover, EVENT.MOUSEMOVE, event);

                if (this._draggingTarget || this._hasfound || this.storage.hasHoverShape()) {
                    this.painter.refreshHover();
                }
            },

            /**
             * 鼠标（手指）离开响应函数
             * 
             * @param {event} event dom事件对象
             */
            mouseout: function (event) {
                event = this._zrenderEventFixed(event);

                var element = event.toElement || event.relatedTarget;
                if (element != this.root) {
                    while (element && element.nodeType != 9) {
                        // 忽略包含在root中的dom引起的mouseOut
                        if (element == this.root) {
                            this._mousemoveHandler(event);
                            return;
                        }

                        element = element.parentNode;
                    }
                }

                event.zrenderX = this._lastX;
                event.zrenderY = this._lastY;
                this.root.style.cursor = 'default';
                this._isMouseDown = 0;

                this._processOutShape(event);
                this._processDrop(event);
                this._processDragEnd(event);
                if (!this.painter.isLoading()) {
                    this.painter.refreshHover();
                }
                
                this.dispatch(EVENT.GLOBALOUT, event);
            },

            /**
             * 鼠标（手指）按下响应函数
             * 
             * @param {event} event dom事件对象
             */
            mousedown: function (event) {
                if (this._lastDownButton == 2) {
                    this._lastDownButton = event.button;
                    this._mouseDownTarget = null;
                    // 仅作为关闭右键菜单使用
                    return;
                }

                this._lastMouseDownMoment = new Date();
                event = this._zrenderEventFixed(event);
                this._isMouseDown = 1;

                //分发config.EVENT.MOUSEDOWN事件
                this._mouseDownTarget = this._lastHover;
                this._dispatchAgency(this._lastHover, EVENT.MOUSEDOWN, event);
                this._lastDownButton = event.button;
            },

            /**
             * 鼠标（手指）抬起响应函数
             * 
             * @param {event} event dom事件对象
             */
            mouseup:function (event) {
                event = this._zrenderEventFixed(event);
                this.root.style.cursor = 'default';
                this._isMouseDown = 0;
                this._mouseDownTarget = null;

                //分发config.EVENT.MOUSEUP事件
                this._dispatchAgency(this._lastHover, EVENT.MOUSEUP, event);
                this._processDrop(event);
                this._processDragEnd(event);
            },

            /**
             * Touch开始响应函数
             * 
             * @param {event} event dom事件对象
             */
            touchstart: function (event) {
                //eventTool.stop(event);// 阻止浏览器默认事件，重要
                event = this._zrenderEventFixed(event, true);
                this._lastTouchMoment = new Date();

                //平板补充一次findHover
                this._mobildFindFixed(event);
                this._mousedownHandler(event);
            },

            /**
             * Touch移动响应函数
             * 
             * @param {event} event dom事件对象
             */
            touchmove: function (event) {
                event = this._zrenderEventFixed(event, true);
                this._mousemoveHandler(event);
                if (this._isDragging) {
                    eventTool.stop(event);// 阻止浏览器默认事件，重要
                }
            },

            /**
             * Touch结束响应函数
             * 
             * @param {event} event dom事件对象
             */
            touchend: function (event) {
                //eventTool.stop(event);// 阻止浏览器默认事件，重要
                event = this._zrenderEventFixed(event, true);
                this._mouseupHandler(event);

                if (new Date() - this._lastTouchMoment < EVENT.touchClickDelay) {
                    this._mobildFindFixed(event);
                    this._clickHandler(event);
                }
                this.painter.clearHover();
            }
        };

        /**
         * bind一个参数的function
         * 
         * @inner
         * @param {Function} handler 要bind的function
         * @param {Object} context 运行时this环境
         * @return {Function}
         */
        function bind1Arg( handler, context ) {
            return function ( e ) {
                return handler.call( context, e );
            };
        }

        /**
         * 为控制类实例初始化dom 事件处理函数
         * 
         * @inner
         * @param {Handler} instance 控制类实例
         */
        function initDomHandler( instance ) {
            var len = domHandlerNames.length;
            while ( len-- ) {
                var name = domHandlerNames[ len ];
                instance[ '_' + name + 'Handler' ] = bind1Arg( domHandlers[ name ], instance );
            }
        }

        /**
         * 控制类 (C)
         * 
         * @param {HTMLElement} root 绘图区域
         * @param {storage} storage Storage实例
         * @param {painter} painter Painter实例
         *
         * 分发事件支持详见config.EVENT
         */
        function Handler(root, storage, painter) {
            // 添加事件分发器特性
            eventTool.Dispatcher.call(this);

            this.root = root;
            this.storage = storage;
            this.painter = painter;

            // 各种事件标识的私有变量
            // this._hasfound = false;              //是否找到hover图形元素
            // this._lastHover = null;              //最后一个hover图形元素
            // this._mouseDownTarget = null;
            // this._draggingTarget = null;         //当前被拖拽的图形元素
            // this._isMouseDown = false;
            // this._isDragging = false;
            // this._lastMouseDownMoment;
            // this._lastTouchMoment;
            // this._lastDownButton;

            this._lastX = 
            this._lastY = 
            this._mouseX = 
            this._mouseY = 0;

            this._findHover = bind1Arg(findHover, this);
            this._domHover = painter.getDomHover();
            initDomHandler(this);

            // 初始化，事件绑定，支持的所有事件都由如下原生事件计算得来
            if (window.addEventListener) {
                window.addEventListener('resize', this._resizeHandler);
                
                if (env.os.tablet || env.os.phone) {
                    // mobile支持
                    root.addEventListener('touchstart', this._touchstartHandler);
                    root.addEventListener('touchmove', this._touchmoveHandler);
                    root.addEventListener('touchend', this._touchendHandler);
                }
                else {
                    // mobile的click/move/up/down自己模拟
                    root.addEventListener('click', this._clickHandler);
                    root.addEventListener('mousewheel', this._mousewheelHandler);
                    root.addEventListener('mousemove', this._mousemoveHandler);
                    root.addEventListener('mousedown', this._mousedownHandler);
                    root.addEventListener('mouseup', this._mouseupHandler);
                } 
                root.addEventListener('DOMMouseScroll', this._mousewheelHandler);
                root.addEventListener('mouseout', this._mouseoutHandler);
            }
            else {
                window.attachEvent('onresize', this._resizeHandler);

                root.attachEvent('onclick', this._clickHandler);
                root.attachEvent('onmousewheel', this._mousewheelHandler);
                root.attachEvent('onmousemove', this._mousemoveHandler);
                root.attachEvent('onmouseout', this._mouseoutHandler);
                root.attachEvent('onmousedown', this._mousedownHandler);
                root.attachEvent('onmouseup', this._mouseupHandler);
            }
        }

        /**
         * 自定义事件绑定
         * @param {string} eventName 事件名称，resize，hover，drag，etc~
         * @param {Function} handler 响应函数
         */
        Handler.prototype.on = function (eventName, handler) {
            this.bind(eventName, handler);
            return this;
        };

        /**
         * 自定义事件解绑
         * @param {string} eventName 事件名称，resize，hover，drag，etc~
         * @param {Function} handler 响应函数
         */
        Handler.prototype.un = function (eventName, handler) {
            this.unbind(eventName, handler);
            return this;
        };

        /**
         * 事件触发
         * @param {string} eventName 事件名称，resize，hover，drag，etc~
         * @param {event=} eventArgs event dom事件对象
         */
        Handler.prototype.trigger = function (eventName, eventArgs) {
            switch (eventName) {
                case EVENT.RESIZE:
                case EVENT.CLICK:
                case EVENT.MOUSEWHEEL:
                case EVENT.MOUSEMOVE:
                case EVENT.MOUSEDOWN:
                case EVENT.MOUSEUP:
                case EVENT.MOUSEOUT:
                    this['_' + eventName + 'Handler'](eventArgs);
                    break;
            }
        };

        /**
         * 释放
         */
        Handler.prototype.dispose = function () {
            var root = this.root;

            if (window.removeEventListener) {
                window.removeEventListener('resize', this._resizeHandler);

                if (env.os.tablet || env.os.phone) {
                    // mobile支持
                    root.removeEventListener('touchstart', this._touchstartHandler);
                    root.removeEventListener('touchmove', this._touchmoveHandler);
                    root.removeEventListener('touchend', this._touchendHandler);
                }
                else {
                    // mobile的click自己模拟
                    root.removeEventListener('click', this._clickHandler);
                    root.removeEventListener('mousewheel', this._mousewheelHandler);
                    root.removeEventListener('mousemove', this._mousemoveHandler);
                    root.removeEventListener('mousedown', this._mousedownHandler);
                    root.removeEventListener('mouseup', this._mouseupHandler);
                }
                root.removeEventListener('DOMMouseScroll', this._mousewheelHandler);
                root.removeEventListener('mouseout', this._mouseoutHandler);
            }
            else {
                window.detachEvent('onresize', this._resizeHandler);

                root.detachEvent('onclick', this._clickHandler);
                root.detachEvent('onmousewheel', this._mousewheelHandler);
                root.detachEvent('onmousemove', this._mousemoveHandler);
                root.detachEvent('onmouseout', this._mouseoutHandler);
                root.detachEvent('onmousedown', this._mousedownHandler);
                root.detachEvent('onmouseup', this._mouseupHandler);
            }

            this.root =
            this._domHover =
            this.storage =
            this.painter = null;
            
            this.un();
        };

        /**
         * 拖拽开始
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragStart = function (event) {
            var _lastHover = this._lastHover;

            if (this._isMouseDown
                && _lastHover
                && _lastHover.draggable
                && !this._draggingTarget
                && this._mouseDownTarget == _lastHover
            ) {
                // 拖拽点击生效时长阀门，某些场景需要降低拖拽敏感度
                if (_lastHover.dragEnableTime && 
                    new Date() - this._lastMouseDownMoment < _lastHover.dragEnableTime
                ) {
                    return;
                }

                var _draggingTarget = _lastHover;
                this._draggingTarget = _draggingTarget;
                this._isDragging = 1;

                _draggingTarget.invisible = true;
                this.storage.mod(_draggingTarget.id);

                //分发config.EVENT.DRAGSTART事件
                this._dispatchAgency(
                    _draggingTarget,
                    EVENT.DRAGSTART,
                    event
                );
                this.painter.refresh();
            }
        };

        /**
         * 拖拽进入目标元素
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragEnter = function (event) {
            if (this._draggingTarget) {
                //分发config.EVENT.DRAGENTER事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGENTER,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽在目标元素上移动
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragOver = function (event) {
            if (this._draggingTarget) {
                //分发config.EVENT.DRAGOVER事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGOVER,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽离开目标元素
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragLeave = function (event) {
            if (this._draggingTarget) {
                //分发config.EVENT.DRAGLEAVE事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGLEAVE,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽在目标元素上完成
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDrop = function (event) {
            if (this._draggingTarget) {
                this._draggingTarget.invisible = false;
                this.storage.mod(this._draggingTarget.id);
                this.painter.refresh();

                //分发config.EVENT.DROP事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DROP,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽结束
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragEnd = function (event) {
            if (this._draggingTarget) {
                //分发config.EVENT.DRAGEND事件
                this._dispatchAgency(
                    this._draggingTarget,
                    EVENT.DRAGEND,
                    event
                );

                this._lastHover = null;
            }

            this._isDragging = 0;
            this._draggingTarget = null;
        };

        /**
         * 鼠标在某个图形元素上移动
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processOverShape = function (event) {
            //分发config.EVENT.MOUSEOVER事件
            this._dispatchAgency(this._lastHover, EVENT.MOUSEOVER, event);
        };

        /**
         * 鼠标离开某个图形元素
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processOutShape = function (event) {
            //分发config.EVENT.MOUSEOUT事件
            this._dispatchAgency(this._lastHover, EVENT.MOUSEOUT, event);
        };

        /**
         * 事件分发代理
         * 
         * @private
         * @param {Object} targetShape 目标图形元素
         * @param {string} eventName 事件名称
         * @param {Object} event 事件对象
         * @param {Object=} draggedShape 拖拽事件特有，当前被拖拽图形元素
         */
        Handler.prototype._dispatchAgency = function (targetShape, eventName, event, draggedShape) {
            var eventHandler = 'on' + eventName;
            var eventPacket = {
                type : eventName,
                event : event,
                target : targetShape,
                cancelBubble: false
            };

            var el = targetShape;

            if (draggedShape) {
                eventPacket.dragged = draggedShape;
            }

            while (el) {
                el[eventHandler] && el[eventHandler](eventPacket);
                el.dispatch(eventName, eventPacket);

                el = el.parent;
                
                if (eventPacket.cancelBubble) {
                    break;
                }
            }

            if (targetShape) {
                // 冒泡到顶级 zrender 对象
                if (!eventPacket.cancelBubble) {
                    this.dispatch(eventName, eventPacket);
                }
            }
            else if (!draggedShape) {
                //无hover目标，无拖拽对象，原生事件分发
                this.dispatch(eventName, {
                    type: eventName,
                    event: event
                });
            }
        };
        
        // touch指尖错觉的尝试偏移量配置
        var MOBILE_TOUCH_OFFSETS = [
            { x: 10 },
            { x: -20 },
            { x: 10, y: 10},
            { y: -20}
        ];

        // touch有指尖错觉，四向尝试，让touch上的点击更好触发事件
        Handler.prototype._mobildFindFixed = function (event) {
            this._lastHover = null;
            this._mouseX = event.zrenderX;
            this._mouseY = event.zrenderY;

            this._event = event;
            this.storage.iterShape(this._findHover, { normal: 'down'});
            for ( var i = 0; !this._lastHover && i < MOBILE_TOUCH_OFFSETS.length ; i++ ) {
                var offset = MOBILE_TOUCH_OFFSETS[ i ];
                offset.x && ( this._mouseX += offset.x );
                offset.y && ( this._mouseX += offset.y );
                this.storage.iterShape(this._findHover, { normal: 'down'});
            }

            if (this._lastHover) {
                event.zrenderX = this._mouseX;
                event.zrenderY = this._mouseY;
            }
        };

        /**
         * 迭代函数，查找hover到的图形元素并即时做些事件分发
         * 
         * @private
         * @param {Object} e 图形元素
         */
        function findHover(shape) {
            if (
                ( this._draggingTarget && this._draggingTarget.id == shape.id ) //迭代到当前拖拽的图形上
                || shape.isSilent() // 打酱油的路过，啥都不响应的shape~
            ) {
                return false;
            }

            var event = this._event;
            if (shape.isCover(this._mouseX, this._mouseY)) {
                if (shape.hoverable) {
                    this.storage.addHover(shape);
                }
                // 查找是否在 clipShape 中
                var p = shape.parent;
                while (p) {
                    if (p.clipShape && !p.clipShape.isCover(this._mouseX, this._mouseY))  {
                        // 已经被祖先 clip 掉了
                        return false;
                    }
                    p = p.parent;
                }

                if (this._lastHover != shape) {
                    this._processOutShape(event);

                    //可能出现config.EVENT.DRAGLEAVE事件
                    this._processDragLeave(event);

                    this._lastHover = shape;

                    //可能出现config.EVENT.DRAGENTER事件
                    this._processDragEnter(event);
                }

                this._processOverShape(event);

                //可能出现config.EVENT.DRAGOVER
                this._processDragOver(event);

                this._hasfound = 1;

                return true;    //找到则中断迭代查找
            }

            return false;
        }

        /**
         * 如果存在第三方嵌入的一些dom触发的事件，或touch事件，需要转换一下事件坐标
         * 
         * @private
         */
        Handler.prototype._zrenderEventFixed = function (event, isTouch) {
            if ( event.zrenderFixed ) {
                return event;
            }

            if (!isTouch) {
                event = event || window.event;
                // 进入对象优先~
                var target = event.toElement
                              || event.relatedTarget
                              || event.srcElement
                              || event.target;

                if (target && target != this._domHover) {
                    event.zrenderX = (typeof event.offsetX != 'undefined'
                                        ? event.offsetX
                                        : event.layerX)
                                      + target.offsetLeft;
                    event.zrenderY = (typeof event.offsetY != 'undefined'
                                        ? event.offsetY
                                        : event.layerY)
                                      + target.offsetTop;
                }
            }
            else {
                var touch = event.type != 'touchend'
                                ? event.targetTouches[0]
                                : event.changedTouches[0];
                if (touch) {
                    var rBounding = this.root.getBoundingClientRect();
                    // touch事件坐标是全屏的~
                    event.zrenderX = touch.clientX - rBounding.left;
                    event.zrenderY = touch.clientY - rBounding.top;
                }
            }

            event.zrenderFixed = 1;
            return event;
        };

        util.merge(Handler.prototype, eventTool.Dispatcher.prototype, true);

        return Handler;
    }
);
