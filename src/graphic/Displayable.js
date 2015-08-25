/**
 * 可绘制的图形基类
 * Base class of all displayable graphic objects
 * @module zrender/graphic/Displayable
 */

define(function (require) {

    var zrUtil = require('../core/util');

    var Style = require('./Style');

    var Element = require('../Element');
    var RectText = require('./mixin/RectText');
    // var Stateful = require('./mixin/Stateful');

    var rectContain = require('../contain/rect');

    /**
     * @alias module:zrender/graphic/Displayable
     * @extends module:zrender/Element
     * @extends module:zrender/graphic/mixin/Stateful
     */
    var Displayable = function (opts) {

        opts = opts || {};

        Element.call(this, opts);

        // Extend properties
        for (var name in opts) {
            if (
                opts.hasOwnProperty(name) &&
                name !== 'style'
            ) {
                this[name] = opts[name];
            }
        }

        /**
         * @type {module:zrender/graphic/Style}
         */
        this.style = new Style(opts.style);

        this._rect = null;
        // Shapes for cascade clipping.
        this.__clipPaths = [];

        // FIXME Stateful must be mixined after style is setted
        // Stateful.call(this, opts);
    };

    Displayable.prototype = {

        constructor: Displayable,

        type: 'displayable',

        /**
         * Displayable 是否为脏，Painter 中会根据该标记判断是否需要是否需要重新绘制
         * Dirty flag. From which painter will determine if this displayable object needs brush
         * @name module:zrender/graphic/Displayable#__dirty
         * @type {boolean}
         */
        __dirty: true,

        /**
         * 图形是否可见，为true时不绘制图形，但是仍能触发鼠标事件
         * If ignore drawing of the displayable object. Mouse event will still be triggered
         * @name module:/zrender/graphic/Displayable#invisible
         * @type {boolean}
         * @default false
         */
        invisible: false,

        /**
         * @name module:/zrender/graphic/Displayable#z
         * @type {number}
         * @default 0
         */
        z: 0,

        /**
         * z层level，决定绘画在哪层canvas中
         * @name module:/zrender/graphic/Displayable#zlevel
         * @type {number}
         * @default 0
         */
        zlevel: 0,

        /**
         * 是否可拖拽
         * @name module:/zrender/graphic/Displayable#draggable
         * @type {boolean}
         * @default false
         */
        draggable: false,

        /**
         * 是否相应鼠标事件
         * @name module:/zrender/graphic/Displayable#hoverable
         * @type {boolean}
         * @default true
         */
        silent: false,

        beforeBrush: function (ctx) {
            ctx.save();

            this.clip(ctx);

            this.style.bind(ctx);

            this.setTransform(ctx);
        },

        afterBrush: function (ctx) {
            ctx.restore();
        },

        clip: function (ctx) {
            // FIXME performance
            var clipPaths = this.__clipPaths;
            if (clipPaths) {
                for (var i = 0; i < clipPaths.length; i++) {
                    var clipPath = clipPaths[i];
                    var m;
                    if (clipPath.needTransform) {
                        m = clipPath.transform;
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                    var path = clipPath.path;
                    path.beginPath(ctx);
                    clipPath.buildPath(path, clipPath.shape);
                    ctx.clip();
                    // Transform back
                    if (clipPath.needTransform) {
                        m = clipPath.invTransform;
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                }
            }
        },

        /**
         * 图形绘制方法
         * @param {Canvas2DRenderingContext} ctx
         */
        // Interface
        brush: function (ctx) {},

        /**
         * 获取最小包围盒
         * @return {module:zrender/core/BoundingRect}
         */
        // Interface
        getBoundingRect: function () {},

        /**
         * 判断坐标 x, y 是否在图形上
         * If displayable element contain coord x, y
         * @param  {number} x
         * @param  {number} y
         * @return {boolean}
         */
        contain: function (x, y) {
            return this.rectContain(x, y);
        },

        /**
         * 判断坐标 x, y 是否在图形的包围盒上
         * If bounding rect of element contain coord x, y
         * @param  {number} x
         * @param  {number} y
         * @return {boolean}
         */
        rectContain: function (x, y) {
            var coord = this.transformCoordToLocal(x, y);
            return rectContain.contain(this.getBoundingRect(), coord[0], coord[1]);
        },

        /**
         * 标记图形元素为脏，并且在下一帧重绘
         * Mark displayable element dirty and refresh next frame
         */
        dirty: function () {
            this.__dirty = true;

            this._rect = null;

            if (this.__zr) {
                this.__zr.refreshNextFrame();
            }
        },

        drift: function (dx, dy) {
            switch (this.draggable) {
                case 'horizontal':
                    dy = 0;
                    break;
                case 'vertical':
                    dx = 0;
                    break;
            }

            this.position[0] += dx;
            this.position[1] += dy;

            this.dirty();
        },

        /**
         * 图形是否会触发事件
         * If displayable object binded any event
         * @return {boolean}
         */
        // TODO, 通过 bind 绑定的事件
        // isSilent: function () {
        //     return !(
        //         this.hoverable || this.draggable
        //         || this.onmousemove || this.onmouseover || this.onmouseout
        //         || this.onmousedown || this.onmouseup || this.onclick
        //         || this.ondragenter || this.ondragover || this.ondragleave
        //         || this.ondrop
        //     );
        // },

        update: function () {
            this.updateTransform();
        },

        /**
         * Alias for animate('style')
         * @param {boolean} loop
         */
        animateStyle: function (loop) {
            return this.animate('style', loop);
        },

        attrKV: function (key, value) {
            if (key !== 'style') {
                this[key] = value;
            }
        }
    };

    zrUtil.inherits(Displayable, Element);

    zrUtil.merge(Displayable.prototype, RectText.prototype, true);
    // zrUtil.merge(Displayable.prototype, Stateful.prototype, true);

    Displayable.prototype.constructor = Displayable;

    return Displayable;
});