/**
 * Painter绘图模块
 * @module zrender/Painter
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         errorrik (errorrik@gmail.com)
 *         pissang (https://www.github.com/pissang)
 */
 define(
    function (require) {
        'use strict';

        var config = require('./config');
        var util = require('./tool/util');
        // var vec2 = require('./tool/vector');
        var log = require('./tool/log');
        var matrix = require('./tool/matrix');
        var BaseLoadingEffect = require('./loadingEffect/Base');
        var Transformable = require('./mixin/Transformable');

        // retina 屏幕优化
        var devicePixelRatio = window.devicePixelRatio || 1;
        devicePixelRatio = Math.max(devicePixelRatio, 1);
        var vmlCanvasManager = window['G_vmlCanvasManager'];

        
        // 返回false的方法，用于避免页面被选中
        function returnFalse() {
            return false;
        }

        // 什么都不干的空方法
        function doNothing() {}

        /**
         * @alias module:zrender/Painter
         * @constructor
         * @param {HTMLElement} root 绘图容器
         * @param {module:zrender/Storage} storage
         */
        var Painter = function (root, storage) {
            /**
             * 绘图容器
             * @type {HTMLElement}
             */
            this.root = root;
            /**
             * @type {module:zrender/Storage}
             */
            this.storage = storage;

            root.innerHTML = '';
            this._width = this._getWidth(); // 宽，缓存记录
            this._height = this._getHeight(); // 高，缓存记录

            var domRoot = document.createElement('div');
            this._domRoot = domRoot;

            // domRoot.onselectstart = returnFalse; // 避免页面选中的尴尬
            domRoot.style.position = 'relative';
            domRoot.style.overflow = 'hidden';
            domRoot.style.width = this._width + 'px';
            domRoot.style.height = this._height + 'px';
            root.appendChild(domRoot);

            this._layers = {};

            this._zlevelList = [];

            this._layerConfig = {};

            this._loadingEffect = new BaseLoadingEffect({});
            this.shapeToImage = this._createShapeToImageProcessor();

            // 创建各层canvas
            // 背景
            this._bgDom = createDom('bg', 'div', this);
            domRoot.appendChild(this._bgDom);
            this._bgDom.onselectstart = returnFalse;
            this._bgDom.style['-webkit-user-select'] = 'none';
            this._bgDom.style['user-select'] = 'none';
            this._bgDom.style['-webkit-touch-callout'] = 'none';

            // 高亮
            var hoverLayer = new Layer('_zrender_hover_', this);
            this._layers['hover'] = hoverLayer;
            domRoot.appendChild(hoverLayer.dom);
            hoverLayer.initContext();

            hoverLayer.dom.onselectstart = returnFalse;
            hoverLayer.dom.style['-webkit-user-select'] = 'none';
            hoverLayer.dom.style['user-select'] = 'none';
            hoverLayer.dom.style['-webkit-touch-callout'] = 'none';

            var me = this;
            this.updatePainter = function (shapeList, callback) {
                me.refreshShapes(shapeList, callback);
            };
        };

        /**
         * 首次绘图，创建各种dom和context
         * 
         * @param {Function} callback 绘画结束后的回调函数
         */
        Painter.prototype.render = function (callback) {
            if (this.isLoading()) {
                this.hideLoading();
            }
            // TODO
            this.refresh(callback, true);

            return this;
        };

        /**
         * 刷新
         * @param {Function} callback 刷新结束后的回调函数
         * @param {boolean} paintAll 强制绘制所有shape
         */
        Painter.prototype.refresh = function (callback, paintAll) {
            var list = this.storage.getShapeList(true);
            this._paintList(list, paintAll);

            if (typeof callback == 'function') {
                callback();
            }

            return this;
        };

        Painter.prototype._paintList = function (list, paintAll) {

            if (typeof(paintAll) == 'undefined') {
                paintAll = false;
            }

            this._updateLayerStatus(list);

            var currentLayer;
            var currentZLevel;
            var ctx;

            for (var id in this._layers) {
                if (id !== 'hover') {
                    this._layers[id].unusedCount++;
                    this._layers[id].updateTransform();
                }
            }

            var invTransform = [];

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];

                if (currentZLevel !== shape.zlevel) {
                    if (currentLayer && currentLayer.needTransform) {
                        ctx.restore();
                    }

                    currentLayer = this.getLayer(shape.zlevel);
                    ctx = currentLayer.ctx;
                    currentZLevel = shape.zlevel;

                    // Reset the count
                    currentLayer.unusedCount = 0;

                    if (currentLayer.dirty || paintAll) {
                        currentLayer.clear();
                    }

                    if (currentLayer.needTransform) {
                        ctx.save();
                        currentLayer.setTransform(ctx);
                    }
                }

                // Start group clipping
                if (shape.__startClip && !vmlCanvasManager) {
                    var clipShape = shape.__startClip;
                    ctx.save();
                    // Set transform
                    if (clipShape.needTransform) {
                        var m = clipShape.transform;
                        matrix.invert(invTransform, m);
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }

                    ctx.beginPath();
                    clipShape.buildPath(ctx, clipShape.style);
                    ctx.clip();

                    // Transform back
                    if (clipShape.needTransform) {
                        var m = invTransform;
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                }

                if ((currentLayer.dirty || paintAll) && !shape.invisible) {
                    if (
                        !shape.onbrush
                        || (shape.onbrush && !shape.onbrush(ctx, false))
                    ) {
                        if (config.catchBrushException) {
                            try {
                                shape.brush(ctx, false, this.updatePainter);
                            }
                            catch (error) {
                                log(
                                    error,
                                    'brush error of ' + shape.type,
                                    shape
                                );
                            }
                        }
                        else {
                            shape.brush(ctx, false, this.updatePainter);
                        }
                    }
                }

                // Stop group clipping
                if (shape.__stopClip && !vmlCanvasManager) {
                    ctx.restore();
                }

                shape.__dirty = false;
            }

            if (currentLayer && currentLayer.needTransform) {
                ctx.restore();
            }

            for (var id in this._layers) {
                if (id !== 'hover') {
                    var layer = this._layers[id];
                    layer.dirty = false;
                    // 删除过期的层
                    // PENDING
                    // if (layer.unusedCount >= 500) {
                    //     this.delLayer(id);
                    // }
                    if (layer.unusedCount == 1) {
                        layer.clear();
                    }
                }
            }
        };

        /**
         * 获取 zlevel 所在层，如果不存在则会创建一个新的层
         * @param {number} zlevel
         */
        Painter.prototype.getLayer = function (zlevel) {
            // Change draw layer
            var currentLayer = this._layers[zlevel];
            if (!currentLayer) {
                var len = this._zlevelList.length;
                var prevLayer = null;
                var i = -1;
                if (len > 0 && zlevel > this._zlevelList[0]) {
                    for (i = 0; i < len - 1; i++) {
                        if (
                            this._zlevelList[i] < zlevel
                            && this._zlevelList[i + 1] > zlevel
                        ) {
                            break;
                        }
                    }
                    prevLayer = this._layers[this._zlevelList[i]];
                }
                this._zlevelList.splice(i + 1, 0, zlevel);

                // Create a new layer
                currentLayer = new Layer(zlevel, this);
                var prevDom = prevLayer ? prevLayer.dom : this._bgDom;
                if (prevDom.nextSibling) {
                    prevDom.parentNode.insertBefore(
                        currentLayer.dom,
                        prevDom.nextSibling
                    );
                }
                else {
                    prevDom.parentNode.appendChild(
                        currentLayer.dom
                    );
                }
                currentLayer.initContext();
                
                this._layers[zlevel] = currentLayer;

                if (this._layerConfig[zlevel]) {
                    util.merge(currentLayer, this._layerConfig[zlevel], true);
                }

                currentLayer.updateTransform();
            }

            return currentLayer;
        };

        /**
         * 获取所有已创建的层
         * @param {Array.<module:zrender/Painter~Layer>} [prevLayer]
         */
        Painter.prototype.getLayers = function () {
            return this._layers;
        };

        Painter.prototype._updateLayerStatus = function (list) {
            
            var layers = this._layers;

            var elCounts = {};
            for (var z in layers) {
                if (z !== 'hover') {
                    elCounts[z] = layers[z].elCount;
                    layers[z].elCount = 0;
                }
            }

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];
                var zlevel = shape.zlevel;
                var layer = layers[zlevel];
                if (layer) {
                    layer.elCount++;
                    // 已经被标记为需要刷新
                    if (layer.dirty) {
                        continue;
                    }
                    layer.dirty = shape.__dirty;
                }
            }

            // 层中的元素数量有发生变化
            for (var z in layers) {
                if (z !== 'hover') {
                    if (elCounts[z] !== layers[z].elCount) {
                        layers[z].dirty = true;
                    }
                }
            }
        };

        /**
         * 指定的图形列表
         * @param {Array.<module:zrender/shape/Base>} shapeList 需要更新的图形元素列表
         * @param {Function} [callback] 视图更新后回调函数
         */
        Painter.prototype.refreshShapes = function (shapeList, callback) {
            for (var i = 0, l = shapeList.length; i < l; i++) {
                var shape = shapeList[i];
                this.storage.mod(shape.id);
            }

            this.refresh(callback);
            return this;
        };

        /**
         * 设置loading特效
         * 
         * @param {Object} loadingEffect loading特效
         * @return {Painter}
         */
        Painter.prototype.setLoadingEffect = function (loadingEffect) {
            this._loadingEffect = loadingEffect;
            return this;
        };

        /**
         * 清除hover层外所有内容
         */
        Painter.prototype.clear = function () {
            for (var k in this._layers) {
                if (k == 'hover') {
                    continue;
                }
                this._layers[k].clear();
            }

            return this;
        };

        /**
         * 修改指定zlevel的绘制参数
         * 
         * @param {string} zlevel
         * @param {Object} config 配置对象
         * @param {string} [config.clearColor=0] 每次清空画布的颜色
         * @param {string} [config.motionBlur=false] 是否开启动态模糊
         * @param {number} [config.lastFrameAlpha=0.7]
         *                 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
         * @param {Array.<number>} [position] 层的平移
         * @param {Array.<number>} [rotation] 层的旋转
         * @param {Array.<number>} [scale] 层的缩放
         * @param {boolean} [zoomable=false] 层是否支持鼠标缩放操作
         * @param {boolean} [panable=false] 层是否支持鼠标平移操作
         */
        Painter.prototype.modLayer = function (zlevel, config) {
            if (config) {
                if (!this._layerConfig[zlevel]) {
                    this._layerConfig[zlevel] = config;
                }
                else {
                    util.merge(this._layerConfig[zlevel], config, true);
                }

                var layer = this._layers[zlevel];

                if (layer) {
                    util.merge(layer, this._layerConfig[zlevel], true);
                }
            }
        };

        /**
         * 删除指定层
         * @param {number} zlevel 层所在的zlevel
         */
        Painter.prototype.delLayer = function (zlevel) {
            var layer = this._layers[zlevel];
            if (!layer) {
                return;
            }
            // Save config
            this.modLayer(zlevel, {
                position: layer.position,
                rotation: layer.rotation,
                scale: layer.scale
            });
            layer.dom.parentNode.removeChild(layer.dom);
            delete this._layers[zlevel];

            this._zlevelList.splice(util.indexOf(this._zlevelList, zlevel), 1);
        };

        /**
         * 刷新hover层
         */
        Painter.prototype.refreshHover = function () {
            this.clearHover();
            var list = this.storage.getHoverShapes(true);
            for (var i = 0, l = list.length; i < l; i++) {
                this._brushHover(list[i]);
            }
            this.storage.delHover();

            return this;
        };

        /**
         * 清除hover层所有内容
         */
        Painter.prototype.clearHover = function () {
            var hover = this._layers.hover;
            hover && hover.clear();

            return this;
        };

        /**
         * 显示loading
         * 
         * @param {Object=} loadingEffect loading效果对象
         */
        Painter.prototype.showLoading = function (loadingEffect) {
            this._loadingEffect && this._loadingEffect.stop();
            loadingEffect && this.setLoadingEffect(loadingEffect);
            this._loadingEffect.start(this);
            this.loading = true;

            return this;
        };

        /**
         * loading结束
         */
        Painter.prototype.hideLoading = function () {
            this._loadingEffect.stop();

            this.clearHover();
            this.loading = false;
            return this;
        };

        /**
         * loading结束判断
         */
        Painter.prototype.isLoading = function () {
            return this.loading;
        };

        /**
         * 区域大小变化后重绘
         */
        Painter.prototype.resize = function () {
            var domRoot = this._domRoot;
            domRoot.style.display = 'none';

            var width = this._getWidth();
            var height = this._getHeight();

            domRoot.style.display = '';

            // 优化没有实际改变的resize
            if (this._width != width || height != this._height) {
                this._width = width;
                this._height = height;

                domRoot.style.width = width + 'px';
                domRoot.style.height = height + 'px';

                for (var id in this._layers) {

                    this._layers[id].resize(width, height);
                }

                this.refresh(null, true);
            }

            return this;
        };

        /**
         * 清除单独的一个层
         * @param {number} zLevel
         */
        Painter.prototype.clearLayer = function (zLevel) {
            var layer = this._layers[zLevel];
            if (layer) {
                layer.clear();
            }
        };

        /**
         * 释放
         */
        Painter.prototype.dispose = function () {
            if (this.isLoading()) {
                this.hideLoading();
            }

            this.root.innerHTML = '';

            this.root =
            this.storage =

            this._domRoot = 
            this._layers = null;
        };

        Painter.prototype.getDomHover = function () {
            return this._layers.hover.dom;
        };

        /**
         * 图像导出
         * @param {string} type
         * @param {string} [backgroundColor='#fff'] 背景色
         * @return {string} 图片的Base64 url
         */
        Painter.prototype.toDataURL = function (type, backgroundColor, args) {
            if (vmlCanvasManager) {
                return null;
            }

            var imageDom = createDom('image', 'canvas', this);
            this._bgDom.appendChild(imageDom);
            var ctx = imageDom.getContext('2d');
            devicePixelRatio != 1 
                && ctx.scale(devicePixelRatio, devicePixelRatio);
            
            ctx.fillStyle = backgroundColor || '#fff';
            ctx.rect(
                0, 0, 
                this._width * devicePixelRatio,
                this._height * devicePixelRatio
            );
            ctx.fill();
            
            var self = this;
            // 升序遍历，shape上的zlevel指定绘画图层的z轴层叠
            
            this.storage.iterShape(
                function (shape) {
                    if (!shape.invisible) {
                        if (!shape.onbrush // 没有onbrush
                            // 有onbrush并且调用执行返回false或undefined则继续粉刷
                            || (shape.onbrush && !shape.onbrush(ctx, false))
                        ) {
                            if (config.catchBrushException) {
                                try {
                                    shape.brush(ctx, false, self.updatePainter);
                                }
                                catch (error) {
                                    log(
                                        error,
                                        'brush error of ' + shape.type,
                                        shape
                                    );
                                }
                            }
                            else {
                                shape.brush(ctx, false, self.updatePainter);
                            }
                        }
                    }
                },
                { normal: 'up', update: true }
            );
            var image = imageDom.toDataURL(type, args); 
            ctx = null;
            this._bgDom.removeChild(imageDom);
            return image;
        };

        /**
         * 获取绘图区域宽度
         */
        Painter.prototype.getWidth = function () {
            return this._width;
        };

        /**
         * 获取绘图区域高度
         */
        Painter.prototype.getHeight = function () {
            return this._height;
        };

        Painter.prototype._getWidth = function () {
            var root = this.root;
            var stl = root.currentStyle
                      || document.defaultView.getComputedStyle(root);

            return ((root.clientWidth || parseInt(stl.width, 10))
                    - parseInt(stl.paddingLeft, 10) // 请原谅我这比较粗暴
                    - parseInt(stl.paddingRight, 10)).toFixed(0) - 0;
        };

        Painter.prototype._getHeight = function () {
            var root = this.root;
            var stl = root.currentStyle
                      || document.defaultView.getComputedStyle(root);

            return ((root.clientHeight || parseInt(stl.height, 10))
                    - parseInt(stl.paddingTop, 10) // 请原谅我这比较粗暴
                    - parseInt(stl.paddingBottom, 10)).toFixed(0) - 0;
        };

        Painter.prototype._brushHover = function (shape) {
            var ctx = this._layers.hover.ctx;

            if (!shape.onbrush // 没有onbrush
                // 有onbrush并且调用执行返回false或undefined则继续粉刷
                || (shape.onbrush && !shape.onbrush(ctx, true))
            ) {
                var layer = this.getLayer(shape.zlevel);
                if (layer.needTransform) {
                    ctx.save();
                    layer.setTransform(ctx);
                }
                // Retina 优化
                if (config.catchBrushException) {
                    try {
                        shape.brush(ctx, true, this.updatePainter);
                    }
                    catch (error) {
                        log(
                            error, 'hoverBrush error of ' + shape.type, shape
                        );
                    }
                }
                else {
                    shape.brush(ctx, true, this.updatePainter);
                }
                if (layer.needTransform) {
                    ctx.restore();
                }
            }
        };

        Painter.prototype._shapeToImage = function (
            id, shape, width, height, devicePixelRatio
        ) {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var devicePixelRatio = window.devicePixelRatio || 1;
            
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            canvas.setAttribute('width', width * devicePixelRatio);
            canvas.setAttribute('height', height * devicePixelRatio);

            ctx.clearRect(0, 0, width * devicePixelRatio, height * devicePixelRatio);

            var shapeTransform = {
                position : shape.position,
                rotation : shape.rotation,
                scale : shape.scale
            };
            shape.position = [ 0, 0, 0 ];
            shape.rotation = 0;
            shape.scale = [ 1, 1 ];
            if (shape) {
                shape.brush(ctx, false);
            }

            var ImageShape = require('./shape/Image');
            var imgShape = new ImageShape({
                id : id,
                style : {
                    x : 0,
                    y : 0,
                    image : canvas
                }
            });

            if (shapeTransform.position != null) {
                imgShape.position = shape.position = shapeTransform.position;
            }

            if (shapeTransform.rotation != null) {
                imgShape.rotation = shape.rotation = shapeTransform.rotation;
            }

            if (shapeTransform.scale != null) {
                imgShape.scale = shape.scale = shapeTransform.scale;
            }

            return imgShape;
        };

        Painter.prototype._createShapeToImageProcessor = function () {
            if (vmlCanvasManager) {
                return doNothing;
            }

            var me = this;

            return function (id, e, width, height) {
                return me._shapeToImage(
                    id, e, width, height, devicePixelRatio
                );
            };
        };

        /**
         * 创建dom
         * 
         * @inner
         * @param {string} id dom id 待用
         * @param {string} type dom type，such as canvas, div etc.
         * @param {Painter} painter painter instance
         */
        function createDom(id, type, painter) {
            var newDom = document.createElement(type);
            var width = painter._width;
            var height = painter._height;

            // 没append呢，请原谅我这样写，清晰~
            newDom.style.position = 'absolute';
            newDom.style.left = 0;
            newDom.style.top = 0;
            newDom.style.width = width + 'px';
            newDom.style.height = height + 'px';
            newDom.setAttribute('width', width * devicePixelRatio);
            newDom.setAttribute('height', height * devicePixelRatio);

            // id不作为索引用，避免可能造成的重名，定义为私有属性
            newDom.setAttribute('data-zr-dom-id', id);
            return newDom;
        }

        /**
         * @alias module:zrender/Painter~Layer
         * @constructor
         * @extends module:zrender/mixin/Transformable
         * @param {string} id
         * @param {module:zrender/Painter} painter
         */
        var Layer = function(id, painter) {
            this.dom = createDom(id, 'canvas', painter);
            this.dom.onselectstart = returnFalse; // 避免页面选中的尴尬
            this.dom.style['-webkit-user-select'] = 'none';
            this.dom.style['user-select'] = 'none';
            this.dom.style['-webkit-touch-callout'] = 'none';

            vmlCanvasManager && vmlCanvasManager.initElement(this.dom);

            this.domBack = null;
            this.ctxBack = null;

            this.painter = painter;

            this.unusedCount = 0;

            this.config = null;

            this.dirty = true;

            this.elCount = 0;

            // Configs
            /**
             * 每次清空画布的颜色
             * @type {string}
             * @default 0
             */
            this.clearColor = 0;
            /**
             * 是否开启动态模糊
             * @type {boolean}
             * @default false
             */
            this.motionBlur = false;
            /**
             * 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
             * @type {number}
             * @default 0.7
             */
            this.lastFrameAlpha = 0.7;
            /**
             * 层是否支持鼠标平移操作
             * @type {boolean}
             * @default false
             */
            this.zoomable = false;
            /**
             * 层是否支持鼠标缩放操作
             * @type {boolean}
             * @default false
             */
            this.panable = false;

            this.maxZoom = Infinity;
            this.minZoom = 0;

            Transformable.call(this);
        };

        Layer.prototype.initContext = function () {
            this.ctx = this.dom.getContext('2d');
            if (devicePixelRatio != 1) { 
                this.ctx.scale(devicePixelRatio, devicePixelRatio);
            }
        };

        Layer.prototype.createBackBuffer = function () {
            if (vmlCanvasManager) { // IE 8- should not support back buffer
                return;
            }
            this.domBack = createDom('back-' + this.id, 'canvas', this.painter);
            this.ctxBack = this.domBack.getContext('2d');

            if (devicePixelRatio != 1) { 
                this.ctxBack.scale(devicePixelRatio, devicePixelRatio);
            }
        };

        /**
         * @param  {number} width
         * @param  {number} height
         */
        Layer.prototype.resize = function (width, height) {
            this.dom.style.width = width + 'px';
            this.dom.style.height = height + 'px';

            this.dom.setAttribute('width', width * devicePixelRatio);
            this.dom.setAttribute('height', height * devicePixelRatio);

            if (devicePixelRatio != 1) { 
                this.ctx.scale(devicePixelRatio, devicePixelRatio);
            }

            if (this.domBack) {
                this.domBack.setAttribute('width', width * devicePixelRatio);
                this.domBack.setAttribute('height', height * devicePixelRatio);

                if (devicePixelRatio != 1) { 
                    this.ctxBack.scale(devicePixelRatio, devicePixelRatio);
                }
            }
        };

        /**
         * 清空该层画布
         */
        Layer.prototype.clear = function () {
            var dom = this.dom;
            var ctx = this.ctx;
            var width = dom.width;
            var height = dom.height;

            var haveClearColor = this.clearColor && !vmlCanvasManager;
            var haveMotionBLur = this.motionBlur && !vmlCanvasManager;
            var lastFrameAlpha = this.lastFrameAlpha;

            if (haveMotionBLur) {
                if (!this.domBack) {
                    this.createBackBuffer();
                } 

                this.ctxBack.globalCompositeOperation = 'copy';
                this.ctxBack.drawImage(
                    dom, 0, 0,
                    width / devicePixelRatio,
                    height / devicePixelRatio
                );
            }

            if (haveClearColor) {
                ctx.save();
                ctx.fillStyle = this.config.clearColor;
                ctx.fillRect(
                    0, 0,
                    width / devicePixelRatio, 
                    height / devicePixelRatio
                );
                ctx.restore();
            }
            else {
                ctx.clearRect(
                    0, 0, 
                    width / devicePixelRatio,
                    height / devicePixelRatio
                );
            }

            if (haveMotionBLur) {
                var domBack = this.domBack;
                ctx.save();
                ctx.globalAlpha = lastFrameAlpha;
                ctx.drawImage(
                    domBack, 0, 0,
                    width / devicePixelRatio,
                    height / devicePixelRatio
                );
                ctx.restore();
            }
        };

        util.merge(Layer.prototype, Transformable.prototype);

        return Painter;
    }
);
