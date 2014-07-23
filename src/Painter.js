/**
 * Painter绘图模块
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         errorrik (errorrik@gmail.com)
 */



define(
    function (require) {

        'use strict';

        var config = require('./config');
        var util = require('./tool/util');
        var log = require('./tool/log');
        var matrix = require('./tool/matrix');
        var BaseLoadingEffect = require('./loadingEffect/Base');

        // retina 屏幕优化
        var devicePixelRatio = window.devicePixelRatio || 1;
        var vmlCanvasManager = window.G_vmlCanvasManager;

        /**
         * 返回false的方法，用于避免页面被选中
         * 
         * @inner
         */
        function returnFalse() {
            return false;
        }

        /**
         * 什么都不干的空方法
         * 
         * @inner
         */
        function doNothing() {}

        /**
         * 绘图类 (V)
         * 
         * @param {HTMLElement} root 绘图区域
         * @param {storage} storage Storage实例
         */
        function Painter(root, storage) {
            this.root = root;
            this.storage = storage;

            root.innerHTML = '';
            this._width = this._getWidth(); // 宽，缓存记录
            this._height = this._getHeight(); // 高，缓存记录

            var domRoot = document.createElement('div');
            this._domRoot = domRoot;

            //domRoot.onselectstart = returnFalse; // 避免页面选中的尴尬
            domRoot.style.position = 'relative';
            domRoot.style.overflow = 'hidden';
            domRoot.style.width = this._width + 'px';
            domRoot.style.height = this._height + 'px';
            root.appendChild(domRoot);

            this._layers = {};

            this._layerConfig = {};

            this._loadingEffect = new BaseLoadingEffect({});
            this.shapeToImage = this._createShapeToImageProcessor();

            // 创建各层canvas
            // 背景
            this._bgDom = createDom('bg', 'div', this);
            domRoot.appendChild(this._bgDom);

            // 高亮
            var hoverLayer = new Layer('_zrender_hover_', this);
            this._layers['hover'] = hoverLayer;
            domRoot.appendChild(hoverLayer.dom);

            hoverLayer.onselectstart = returnFalse;

            var me = this;
            this.updatePainter = function(shapeList, callback) {
                me.update(shapeList, callback);
            };
        }

        /**
         * 首次绘图，创建各种dom和context
         * 
         * @param {Function=} callback 绘画结束后的回调函数
         */
        Painter.prototype.render = function (callback) {
            if (this.isLoading()) {
                this.hideLoading();
            }

            // TODO
            this.refresh(callback);

            return this;
        };

        /**
         * 刷新
         * 
         * @param {Function=} callback 刷新结束后的回调函数
         */
        Painter.prototype.refresh = function (callback) {

            var list = this.storage.getShapeList(true);

            this._paintList(list);

            if (typeof callback == 'function') {
                callback();
            }

            return this;
        };

        Painter.prototype._paintList = function(list) {

            var layerStatus = this._getLayerStatus(list);

            var currentLayer;
            var currentZLevel;
            var currentLayerDirty = true;
            var ctx;

            for (var id in this._layers) {
                if (id !== 'hover') {
                    this._layers[id].unusedCount++;
                }
            }

            var invTransform = [];

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];

                if (currentZLevel !== shape.zlevel) {
                    currentLayer = this._getLayer(shape.zlevel, currentLayer);
                    ctx = currentLayer.ctx;
                    currentZLevel = shape.zlevel;
                    currentLayerDirty = layerStatus[currentZLevel];

                    // Reset the count
                    currentLayer.unusedCount = 0;

                    if (currentLayerDirty) {
                        currentLayer.clear();
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

                if (currentLayerDirty && !shape.invisible) {
                    if (
                        !shape.onbrush
                        || (shape.onbrush && !shape.onbrush(ctx, false))
                    ) {
                        if (config.catchBrushException) {
                            try {
                                shape.brush(ctx, false, this.updatePainter);
                            }
                            catch(error) {
                                log(
                                    error,
                                    'brush error of ' + shape.type,
                                    shape
                                );
                            }
                        } else {
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

            for (var id in this._layers) {
                if (id !== 'hover') {
                    var layer = this._layers[id];
                    if (layer.unusedCount >= 2) {
                        delete this._layers[id];
                        layer.dom.parentNode.removeChild(layer.dom);
                    }
                    else if (layer.unusedCount == 1) {
                        layer.clear();
                    }
                }
            }
        };

        Painter.prototype._getLayer = function(zlevel, prevLayer) {
            // Change draw layer
            var currentLayer = this._layers[zlevel];
            if (!currentLayer) {
                // Create a new layer
                currentLayer = new Layer(zlevel, this);
                var prevDom = prevLayer ? prevLayer.dom : this._bgDom;
                if (prevDom.nextSibling) {
                    prevDom.parentNode.insertBefore(
                        currentLayer.dom,
                        prevDom.nextSibling
                    );
                } else {
                    prevDom.parentNode.appendChild(
                        currentLayer.dom
                    );
                }

                this._layers[zlevel] = currentLayer;

                currentLayer.config = this._layerConfig[zlevel];
            }

            return currentLayer;
        };

        Painter.prototype._getLayerStatus = function(list) {

            var obj = {};

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];
                var zlevel = shape.zlevel;
                // Already mark as dirty
                if (obj[zlevel]) {
                    continue;
                }
                obj[zlevel] = shape.__dirty;
            }

            return obj;
        };

        /**
         * 视图更新
         * 
         * @param {Array} shapeList 需要更新的图形元素列表
         * @param {Function} callback  视图更新后回调函数
         */
        Painter.prototype.update = function (shapeList, callback) {
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
         */
        Painter.prototype.modLayer = function (zlevel, config) {
            if (config) {
                if (!this._layerConfig[zlevel]) {
                    this._layerConfig[zlevel] = config;
                } else {
                    util.merge(this._layerConfig[zlevel], config, true);
                }

                var layer = this._layers[zlevel];

                if (layer) {
                    layer.config = this._layerConfig[zlevel];
                }
            }
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
            if (this._width != width || height != this._height){
                this._width = width;
                this._height = height;

                domRoot.style.width = width + 'px';
                domRoot.style.height = height + 'px';

                for (var id in this._layers) {

                    this._layers[id].resize(width, height);
                }

                this.refresh();
            }

            return this;
        };

        /**
         * 清除单独的一个层
         */
        Painter.prototype.clearLayer = function (k) {
            var layer = this._layers[k];
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
            
            //升序遍历，shape上的zlevel指定绘画图层的z轴层叠
            
            this.storage.iterShape(
                function (shape) {
                    if (!shape.invisible) {
                        if (!shape.onbrush //没有onbrush
                            //有onbrush并且调用执行返回false或undefined则继续粉刷
                            || (shape.onbrush && !shape.onbrush(ctx, false))
                        ) {
                            if (config.catchBrushException) {
                                try {
                                    shape.brush(ctx, false, this.updatePainter);
                                }
                                catch(error) {
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

        Painter.prototype._getWidth = function() {
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

        /**
         * 鼠标悬浮刷画
         */
        Painter.prototype._brushHover = function (shape) {
            var ctx = this._layers.hover.ctx;

            if (!shape.onbrush //没有onbrush
                //有onbrush并且调用执行返回false或undefined则继续粉刷
                || (shape.onbrush && !shape.onbrush(ctx, true))
            ) {
                // Retina 优化
                if (config.catchBrushException) {
                    try {
                        shape.brush(ctx, true, this.updatePainter);
                    }
                    catch(error) {
                        log(
                            error, 'hoverBrush error of ' + shape.type, shape
                        );
                    }
                }
                else {
                    shape.brush(ctx, true, this.updatePainter);
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
            shape.position = [0, 0, 0];
            shape.rotation = 0;
            shape.scale = [1, 1];
            if (shape) {
                shape.brush(ctx, false);
            }

            var ImageShape = require( './shape/Image' );
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

            var painter = this;

            return function (id, e, width, height) {
                return painter._shapeToImage(
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

        /*****************************************
         * Layer
         *****************************************/
        function Layer(id, painter) {
            this.dom = createDom(id, 'canvas', painter);
            vmlCanvasManager && vmlCanvasManager.initElement(this.dom);

            this.ctx = this.dom.getContext('2d');

            if (devicePixelRatio != 1) { 
                this.ctx.scale(devicePixelRatio, devicePixelRatio);
            }

            this.domBack = null;
            this.ctxBack = null;

            this.painter = painter;

            this.unusedCount = 0;

            this.config = null;
        }

        Layer.prototype.createBackBuffer = function() {
            if (vmlCanvasManager) { // IE 8- should not support back buffer
                return;
            }
            this.domBack = createDom('back-' + this.id, 'canvas', this.painter);
            this.ctxBack = this.domBack.getContext('2d');

            if (devicePixelRatio != 1) { 
                this.ctxBack.scale(devicePixelRatio, devicePixelRatio);
            }
        };

        Layer.prototype.resize = function(width, height) {
            
            this.dom.setAttribute('width', width);
            this.dom.setAttribute('height', height);
            this.dom.style.width = width + 'px';
            this.dom.style.height = height + 'px';

            this.dom.setAttribute('width', width * devicePixelRatio);
            this.dom.setAttribute('height', height * devicePixelRatio);

            if (devicePixelRatio != 1) { 
                this.ctx.scale(devicePixelRatio, devicePixelRatio);
            }

            if (this.domBack) {
                this.domBack.setAttribute('width', width * devicePixelRatio);
                this.domBack.setAttribute('height', width * devicePixelRatio);

                if (devicePixelRatio != 1) { 
                    this.ctxBack.scale(devicePixelRatio, devicePixelRatio);
                }
            }
        };

        Layer.prototype.clear = function() {
            var config = this.config;
            var dom = this.dom;
            var ctx = this.ctx;
            var width = dom.width;
            var height = dom.height;

            if (config) {
                var haveClearColor =
                    typeof(config.clearColor) !== 'undefined'
                    && !vmlCanvasManager;
                var haveMotionBLur = config.motionBlur && !vmlCanvasManager;
                var lastFrameAlpha = config.lastFrameAlpha;
                if (typeof(lastFrameAlpha) == 'undefined') {
                    lastFrameAlpha = 0.7;
                }

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
                        width * devicePixelRatio, 
                        height * devicePixelRatio
                    );
                    ctx.restore();
                }
                else {
                    ctx.clearRect(
                        0, 0, 
                        width * devicePixelRatio, 
                        height * devicePixelRatio
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
            }
            else {
                ctx.clearRect(
                    0, 0, 
                    width,
                    height
                );
            }
        };

        return Painter;
    }
);
