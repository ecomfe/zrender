/*!
 * ZRender, a lightweight canvas library with a MVC architecture, data-driven 
 * and provides an event model like DOM.
 *  
 * Copyright (c) 2013, Baidu Inc.
 * All rights reserved.
 * 
 * LICENSE
 * https://github.com/ecomfe/zrender/blob/master/LICENSE.txt
 */

/**
 * zrender: core核心类
 *
 * @desc zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(
    function(require) {
        /*
         * HTML5 Canvas for Internet Explorer!
         * Modern browsers like Firefox, Safari, Chrome and Opera support
         * the HTML5 canvas tag to allow 2D command-based drawing.
         * ExplorerCanvas brings the same functionality to Internet Explorer.
         * To use, web developers only need to include a single script tag
         * in their existing web pages.
         *
         * https://code.google.com/p/explorercanvas/
         * http://explorercanvas.googlecode.com/svn/trunk/excanvas.js
         */
        // 核心代码会生成一个全局变量 G_vmlCanvasManager，模块改造后借用于快速判断canvas支持
        require('./lib/excanvas');

        var util = require('./tool/util');
        var Handler = require( './Handler' );
        var Painter = require( './Painter' );
        var Storage = require( './Storage' );

        var self = {};
        var zrender = self;     // 提供MVC内部反向使用静态方法；

        var _idx = 0;           //ZRender instance's id
        var _instances = {};    //ZRender实例map索引

        self.version = '1.1.0';

        /**
         * zrender初始化
         * 不让外部直接new ZRender实例，为啥？
         * 不为啥，提供全局可控同时减少全局污染和降低命名冲突的风险！
         *
         * @param {HTMLElement} dom dom对象，不帮你做document.getElementById了
         * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
         *
         * @return {ZRender} ZRender实例
         */
        self.init = function(dom, params) {
            var zi = new ZRender(++_idx + '', dom, params || {});
            _instances[_idx] = zi;
            return zi;
        };

        /**
         * zrender实例销毁，记在_instances里的索引也会删除了
         * 管生就得管死，可以通过zrender.dispose(zi)销毁指定ZRender实例
         * 当然也可以直接zi.dispose()自己销毁
         *
         * @param {ZRender=} zi ZRender对象，不传则销毁全部
         */
        self.dispose = function(zi) {
            if (zi) {
                zi.dispose();
            }
            else {
                for (var z in _instances) {
                    _instances[z].dispose();
                }
                _instances = {};
            }
            return self;
        };

        /**
         * 获取zrender实例
         *
         * @param {string} id ZRender对象索引
         */
        self.getInstance = function(id) {
            return _instances[id];
        };

        /**
         * 删除zrender实例，ZRender实例dispose时会调用，
         * 删除后getInstance则返回undefined
         * ps: 仅是删除，删除的实例不代表已经dispose了~~
         *     这是一个摆脱全局zrender.dispose()自动销毁的后门，
         *     take care of yourself~
         *
         * @param {string} id ZRender对象索引
         */
        self.delInstance = function(id) {
            if (_instances[id]) {
                //只是对垃圾回收上的友好照顾，不写也大不了~
                _instances[id] = null;
                delete _instances[id];
            }
            return self;
        };

        // 是否异常捕获
        self.catchBrushException = false;

        /**
         * debug日志选项：catchBrushException为true下有效
         * 0 : 不生成debug数据，发布用
         * 1 : 异常抛出，调试用
         * 2 : 控制台输出，调试用
         */
        self.debugMode = 0;
        self.log = function() {
            if (self.debugMode === 0) {
                return;
            }
            else if (self.debugMode == 1) {
                for (var k in arguments) {
                    throw new Error(arguments[k]);
                }
            }
            else if (self.debugMode > 1) {
                for (var k in arguments) {
                    console.log(arguments[k]);
                }
            }

            return self;
        };
        /* for debug
        self.log = function(mes) {
            document.getElementById('wrong-message').innerHTML =
                mes + ' ' + (new Date() - 0)
                + '<br/>' 
                + document.getElementById('wrong-message').innerHTML;
        };
        */
        /**
         * ZRender接口类，对外可用的所有接口都在这里！！
         * storage（M）、painter（V）、handler（C）为内部私有类，外部接口不可见
         * 非get接口统一返回self支持链式调用~
         *
         * @param {string} id 唯一标识
         * @param {HTMLElement} dom dom对象，不帮你做document.getElementById
         * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
         *
         * @return {ZRender} ZRender实例
         */
        function ZRender(id, dom, params) {
            var self = this;
            self.env = require('./tool/env');
            
            var shape = require('./shape');
            // 内置图形注册
            require('./shape/circle');
            require('./shape/ellipse');
            require('./shape/line');
            require('./shape/polygon');
            require('./shape/brokenLine');
            require('./shape/rectangle');
            require('./shape/ring');
            require('./shape/sector');
            require('./shape/text');
            require('./shape/heart');
            require('./shape/droplet');
            require('./shape/path');
            require('./shape/image');
            require('./shape/beziercurve');
            require('./shape/star');
            require('./shape/isogon');
            
            var shapeLibrary;

            if (typeof params.shape == 'undefined') {
                //默认图形库
                shapeLibrary = shape;
            }
            else {
                //自定义图形库，私有化，实例独占
                shapeLibrary = {};
                for (var s in params.shape) {
                    shapeLibrary[s] = params.shape[s];
                }
                shapeLibrary.get = function(name) {
                    return shapeLibrary[name] || shape.get(name);
                };
            }

            var storage = new Storage(shapeLibrary);
            var painter = new Painter(dom, storage, shapeLibrary);
            var handler = new Handler(dom, storage, painter, shapeLibrary);

            // 动画控制
            var Animation = require('./animation/animation');
            var animatingShapes = [];
            var animation = new Animation({
                stage : {
                    update : function(){
                        var shapes = animatingShapes;
                        for (var i = 0, l = shapes.length; i < l; i++) {
                            storage.mod(shapes[i].id);
                        }
                        if (shapes.length > 0) {
                            painter.refresh();
                        }
                    }
                }
            });
            animation.start();

            /**
             * 获取实例唯一标识
             */
            self.getId = function() {
                return id;
            };

            /**
             * 添加图形形状
             * @param {Object} shape 形状对象，可用属性全集，详见各shape
             */
            self.addShape = function(shape) {
                storage.add(shape);
                return self;
            };

            /**
             * 删除图形形状
             * @param {string} shapeId 形状对象唯一标识
             */
            self.delShape = function(shapeId) {
                storage.del(shapeId);
                return self;
            };

            /**
             * 修改图形形状
             * @param {string} shapeId 形状对象唯一标识
             * @param {Object} shape 形状对象
             * @param {fast} boolean 默认为false, 如果为true的话会在merge中省略部分判断
             */
            self.modShape = function(shapeId, shape, fast) {
                storage.mod(shapeId, shape, fast);
                return self;
            };

            /**
             * 修改指定zlevel的绘制配置项，例如clearColor
             * @param {string} zLevel
             * @param {Object} config 配置对象, 目前支持clearColor 
             */
            self.modLayer = function(zLevel, config) {
                painter.modLayer(zLevel, config);
            }

            /**
             * 添加额外高亮层显示，仅提供添加方法，每次刷新后高亮层图形均被清空
             * @param {Object} shape 形状对象
             */
            self.addHoverShape = function(shape) {
                storage.addHover(shape);
                return self;
            };

            /**
             * 渲染
             * @param {Function} callback  渲染结束后回调函数
             * todo:增加缓动函数
             */
            self.render = function(callback) {
                painter.render(callback);
                return self;
            };

            /**
             * 视图更新
             * @param {Function} callback  视图更新后回调函数
             */
            self.refresh = function(callback) {
                painter.refresh(callback);
                return self;
            };
            
            /**
             * 高亮层更新
             * @param {Function} callback  视图更新后回调函数
             */
            self.refreshHover = function(callback) {
                painter.refreshHover(callback);
                return self;
            };

            /**
             * 视图更新
             * @param {Array} shapeList 需要更新的图形元素列表
             * @param {Function} callback  视图更新后回调函数
             */
            self.update = function(shapeList, callback) {
                painter.update(shapeList, callback);
                return self;
            };

            self.resize = function() {
                painter.resize();
                return self;
            };

            /**
             * 动画
             * @param {string} shapeId 形状对象唯一标识
             * @param {string} path 需要添加动画的属性获取路径，可以通过a.b.c来获取深层的属性
             * @param {boolean} loop 动画是否循环
             * @return {Object} 动画的Deferred对象
             * Example:
             * zr.animate( circleId, 'style', false)
             *   .when(1000, { x: 10} )
             *   .done( function(){ console.log('Animation done')})
             *   .start()
             */
            self.animate = function(shapeId, path, loop) {
                var shape = storage.get(shapeId);
                if (shape) {
                    var target;
                    if (path) {
                        var pathSplitted = path.split('.');
                        var prop = shape;
                        for (var i = 0, l = pathSplitted.length; i < l; i++) {
                            if (!prop) {
                                continue;
                            }
                            prop = prop[pathSplitted[i]];
                        }
                        if (prop) {
                            target = prop;
                        }
                    }
                    else {
                        target = shape;
                    }
                    if (!target) {
                        zrender.log(
                            'Property "'
                            + path
                            + '" is not existed in shape '
                            + shapeId
                        );
                        return;
                    }

                    if (typeof(shape.__aniCount) === 'undefined') {
                        // 正在进行的动画记数
                        shape.__aniCount = 0;
                    }
                    if (shape.__aniCount === 0) {
                        animatingShapes.push(shape);
                    }
                    shape.__aniCount++;

                    return animation.animate(target, {loop : loop})
                        .done(function() {
                            shape.__aniCount --;
                            if( shape.__aniCount === 0){
                                // 从animatingShapes里移除
                                var idx = util.indexOf(animatingShapes, shape);
                                animatingShapes.splice(idx, 1);
                            }
                        });
                }
                else {
                    zrender.log('Shape "'+ shapeId + '" not existed');
                }
            };

            /**
             * 停止所有动画
             */
            self.clearAnimation = function() {
                animation.clear();
            };

            /**
             * loading显示
             * @param  {Object} loadingOption 参数
             * {
             *     effect,
             *     //loading话术
             *     text:'',
             *     // 水平安放位置，默认为 'center'，可指定x坐标
             *     x:'center' || 'left' || 'right' || {number},
             *     // 垂直安放位置，默认为'top'，可指定y坐标
             *     y:'top' || 'bottom' || {number},
             *
             *     textStyle:{
             *         textFont: 'normal 20px Arial' || {textFont}, //文本字体
             *         color: {color}
             *     }
             * }
             */
            self.showLoading = function(loadingOption) {
                painter.showLoading(loadingOption);
                return self;
            };

            /**
             * loading结束
             */
            self.hideLoading = function() {
                painter.hideLoading();
                return self;
            };

            /**
             * 生成形状唯一ID
             * @param {string} [idPrefix] id前缀
             * @return {string} 不重复ID
             */
            self.newShapeId = function(idPrefix) {
                return storage.newShapeId(idPrefix);
            };

            /**
             * 获取视图宽度
             */
            self.getWidth = function() {
                return painter.getWidth();
            };

            /**
             * 获取视图高度
             */
            self.getHeight = function() {
                return painter.getHeight();
            };

            /**
             * 图像导出 
             */
            self.toDataURL = function(type, backgroundColor, args) {
                return painter.toDataURL(type, backgroundColor, args);
            };

            /**
             * 将常规shape转成image shape
             */
            self.shapeToImage = function(e, width, height) {
                var id = self.newShapeId('image');
                return painter.shapeToImage(id, e, width, height);
            };

            /**
             * 事件绑定
             * @param {string} eventName 事件名称
             * @param {Function} eventHandler 响应函数
             */
            self.on = function(eventName, eventHandler) {
                handler.on(eventName, eventHandler);
                return self;
            };

            /**
             * 事件解绑定，参数为空则解绑所有自定义事件
             * @param {string} eventName 事件名称
             * @param {Function} eventHandler 响应函数
             */
            self.un = function(eventName, eventHandler) {
                handler.un(eventName, eventHandler);
                return self;
            };
            
            /**
             * 事件触发
             * @param {string} event 事件名称，resize，hover，drag，etc~
             * @param {event=} event event dom事件对象
             */
            self.trigger = function(eventName, event) {
                handler.trigger(eventName, event);
                return self;
            };
            

            /**
             * 清除当前ZRender下所有类图的数据和显示，clear后MVC和已绑定事件均还存在在，ZRender可用
             */
            self.clear = function() {
                storage.del();
                painter.clear();
                return self;
            };

            /**
             * 释放当前ZR实例（删除包括dom，数据、显示和事件绑定），dispose后ZR不可用
             */
            self.dispose = function() {
                animation.stop();
                animation = null;
                animatingShapes = null;

                self.clear();
                self = null;

                storage.dispose();
                storage = null;

                painter.dispose();
                painter = null;

                handler.dispose();
                handler = null;

                //释放后告诉全局删除对自己的索引，没想到啥好方法
                zrender.delInstance(id);

                return;
            };
        }

        return self;
    }
);