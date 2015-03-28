/**
 * Painter绘图模块
 * @module zrender/Painter
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         errorrik (errorrik@gmail.com)
 *         pissang (https://www.github.com/pissang)
 */
 define(function (require) {
    'use strict';

    var config = require('./config');
    var util = require('./core/util');
    var log = require('./core/log');

    var Layer = require('./Layer');

    // 返回false的方法，用于避免页面被选中
    function returnFalse() {
        return false;
    }

    // 什么都不干的空方法
    function doNothing() {}

    function isLayerValid(layer) {
        if (!layer) {
            return false;
        }
        
        if (layer.isBuildin) {
            return true;
        }

        if (typeof(layer.resize) !== 'function'
            || typeof(layer.refresh) !== 'function'
        ) {
            return false;
        }

        return true;
    }

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

        var rootStyle = root.style;
        rootStyle['-webkit-tap-highlight-color'] = 'transparent';
        rootStyle['-webkit-user-select'] = 'none';
        rootStyle['user-select'] = 'none';
        rootStyle['-webkit-touch-callout'] = 'none';

        /**
         * @type {module:zrender/Storage}
         */
        this.storage = storage;

        root.innerHTML = '';
        this._width = this._getWidth(); // 宽，缓存记录
        this._height = this._getHeight(); // 高，缓存记录

        var domRoot = document.createElement('div');
        this._domRoot = domRoot;
        var domRootStyle = domRoot.style;

        // domRoot.onselectstart = returnFalse; // 避免页面选中的尴尬
        domRootStyle.position = 'relative';
        domRootStyle.overflow = 'hidden';
        domRootStyle.width = this._width + 'px';
        domRootStyle.height = this._height + 'px';
        root.appendChild(domRoot);

        this._layers = {};

        this._zlevelList = [];

        this._layerConfig = {};

        this.pathToImage = this._createPathToImageProcessor();
    };

    /**
     * 刷新
     * @param {Function} callback 刷新结束后的回调函数
     * @param {boolean} paintAll 强制绘制所有shape
     */
    Painter.prototype.refresh = function (callback, paintAll) {
        var list = this.storage.getDisplayableList(true);
        this._paintList(list, paintAll);

        // Paint custum layers
        for (var i = 0; i < this._zlevelList.length; i++) {
            var z = this._zlevelList[i];
            var layer = this._layers[z];
            if (! layer.isBuildin && layer.refresh) {
                layer.refresh();
            }
        }

        if (typeof callback == 'function') {
            callback();
        }

        return this;
    };

    Painter.prototype._preProcessLayer = function (layer) {
        layer.unusedCount++;
        layer.updateTransform();
    };

    Painter.prototype._postProcessLayer = function (layer) {
        layer.dirty = false;
        // 删除过期的层
        // PENDING
        // if (layer.unusedCount >= 500) {
        //     this.delLayer(z);
        // }
        if (layer.unusedCount == 1) {
            layer.clear();
        }
    };

    Painter.prototype._paintList = function (list, paintAll) {

        if (typeof(paintAll) == 'undefined') {
            paintAll = false;
        }

        this._updateLayerStatus(list);

        var currentLayer;
        var currentZLevel;
        var ctx;

        this.eachBuildinLayer(this._preProcessLayer);

        // var invTransform = [];

        for (var i = 0, l = list.length; i < l; i++) {
            var shape = list[i];

            // Change draw layer
            if (currentZLevel !== shape.zlevel) {
                if (currentLayer) {
                    if (currentLayer.needTransform) {
                        ctx.restore();
                    }
                    ctx.flush && ctx.flush();
                }

                currentZLevel = shape.zlevel;
                currentLayer = this.getLayer(currentZLevel);

                if (!currentLayer.isBuildin) {
                    log(
                        'ZLevel ' + currentZLevel
                        + ' has been used by unkown layer ' + currentLayer.id
                    );
                }

                ctx = currentLayer.ctx;

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

            if ((currentLayer.dirty || paintAll) && !shape.invisible) {
                if (
                    !shape.onbrush
                    || (shape.onbrush && !shape.onbrush(ctx, false))
                ) {
                    if (config.catchBrushException) {
                        try {
                            shape.brush(ctx, false);
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
                        shape.brush(ctx, false);
                    }
                }
            }

            shape.__dirty = false;
        }

        if (currentLayer) {
            if (currentLayer.needTransform) {
                ctx.restore();
            }
            ctx.flush && ctx.flush();
        }

        this.eachBuildinLayer(this._postProcessLayer);
    };

    /**
     * 获取 zlevel 所在层，如果不存在则会创建一个新的层
     * @param {number} zlevel
     * @return {module:zrender/Layer}
     */
    Painter.prototype.getLayer = function (zlevel) {
        var layer = this._layers[zlevel];
        if (!layer) {
            // Create a new layer
            layer = new Layer(zlevel, this);
            layer.isBuildin = true;

            if (this._layerConfig[zlevel]) {
                util.merge(layer, this._layerConfig[zlevel], true);
            }

            layer.updateTransform();

            this.insertLayer(zlevel, layer);

            // Context is created after dom inserted to document
            // Or excanvas will get 0px clientWidth and clientHeight
            layer.initContext();
        }

        return layer;
    };

    Painter.prototype.insertLayer = function (zlevel, layer) {
        if (this._layers[zlevel]) {
            log('ZLevel ' + zlevel + ' has been used already');
            return;
        }
        // Check if is a valid layer
        if (!isLayerValid(layer)) {
            log('Layer of zlevel ' + zlevel + ' is not valid');
            return;
        }

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

        var domRoot = this._domRoot;
        if (prevLayer) {
            var prevDom = prevLayer.dom;
            if (prevDom.nextSibling) {
                domRoot.insertBefore(
                    layer.dom,
                    prevDom.nextSibling
                );
            }
            else {
                domRoot.appendChild(layer.dom);
            }
        }
        else {
            if (domRoot.firstChild) {
                domRoot.insertBefore(layer.dom, domRoot.firstChild);
            }
            else {
                domRoot.appendChild(layer.dom);
            }
        }

        this._layers[zlevel] = layer;
    };

    // Iterate each layer
    Painter.prototype.eachLayer = function (cb, context) {
        for (var i = 0; i < this._zlevelList.length; i++) {
            var z = this._zlevelList[i];
            cb.call(context, this._layers[z], z);
        }
    };

    // Iterate each buildin layer
    Painter.prototype.eachBuildinLayer = function (cb, context) {
        for (var i = 0; i < this._zlevelList.length; i++) {
            var z = this._zlevelList[i];
            var layer = this._layers[z];
            if (layer.isBuildin) {
                cb.call(context, layer, z);
            }
        }
    };

    // Iterate each other layer except buildin layer
    Painter.prototype.eachOtherLayer = function (cb, context) {
        for (var i = 0; i < this._zlevelList.length; i++) {
            var z = this._zlevelList[i];
            var layer = this._layers[z];
            if (! layer.isBuildin) {
                cb.call(context, layer, z);
            }
        }
    };

    /**
     * 获取所有已创建的层
     * @param {Array.<module:zrender/Layer>} [prevLayer]
     */
    Painter.prototype.getLayers = function () {
        return this._layers;
    };

    Painter.prototype._updateLayerStatus = function (list) {
        
        var layers = this._layers;

        var elCounts = {};

        this.eachBuildinLayer(function (layer, z) {
            elCounts[z] = layer.elCount;
            layer.elCount = 0;
        });

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
        this.eachBuildinLayer(function (layer, z) {
            if (elCounts[z] !== layer.elCount) {
                layer.dirty = true;
            }
        });
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
        this.eachBuildinLayer(this._clearLayer);
        return this;
    };

    Painter.prototype._clearLayer = function (layer) {
        layer.clear();
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
        this.root.innerHTML = '';

        this.root =
        this.storage =

        this._domRoot = 
        this._layers = null;
    };

    /**
     * 图像导出
     * @param {string} type
     * @param {string} [backgroundColor='#fff'] 背景色
     * @return {string} 图片的Base64 url
     */
    Painter.prototype.toDataURL = function (type, backgroundColor, args) {
        if (window['G_vmlCanvasManager']) {
            return null;
        }

        var imageLayer = new Layer('image', this);
        this._domRoot.appendChild(imageLayer.dom);
        imageLayer.initContext();
        
        var ctx = imageLayer.ctx;
        imageLayer.clearColor = backgroundColor || '#fff';
        imageLayer.clear();
        
        var self = this;

        var displayableList = this.storage.getDisplayableList(true);

        for (var i = 0; i < displayableList.length; i++) {
            var shape = displayableList[i];
            if (!shape.invisible) {
                if (!shape.onbrush // 没有onbrush
                    // 有onbrush并且调用执行返回false或undefined则继续粉刷
                    || (shape.onbrush && !shape.onbrush(ctx, false))
                ) {
                    if (config.catchBrushException) {
                        try {
                            shape.brush(ctx, false, self.refreshNextFrame);
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
                        shape.brush(ctx, false, self.refreshNextFrame);
                    }
                }
            }
        }

        var image = imageLayer.dom.toDataURL(type, args); 
        ctx = null;
        this._domRoot.removeChild(imageLayer.dom);
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

    Painter.prototype._pathToImage = function (
        id, shape, width, height, devicePixelRatio
    ) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;

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
            shape.brush(ctx);
        }

        var ImageShape = require('./graphic/Image');
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

    Painter.prototype._createPathToImageProcessor = function () {
        if (window['G_vmlCanvasManager']) {
            return doNothing;
        }

        var me = this;

        return function (id, e, width, height) {
            return me._pathToImage(
                id, e, width, height, config.devicePixelRatio
            );
        };
    };

    return Painter;
});
