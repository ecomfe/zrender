/**
 * 可绘制的图形基类
 * Base class of all displayable graphic objects
 * @module zrender/graphic/Displayable
 */

define(function (require) {

    var guid = require('../core/guid');
    var zrUtil = require('../core/util');

    var Style = require('./Style');

    var RectText = require('./mixin/RectText');
    var Stateful = require('./mixin/Stateful');
    var Eventful = require('../mixin/Eventful');
    var Transformable = require('../mixin/Transformable');

    var rectContain = require('../contain/rect');

    /**
     * @alias module:zrender/graphic/Displayable
     * @extends module:zrender/mixin/Transformable
     * @extends module:zrender/mixin/Eventful
     */
    var Displayable = function (opts) {

        Eventful.call(this, opts);
        Transformable.call(this, opts);

        opts = opts || {};

        // Extend properties
        for (var name in opts) {
            if (
                opts.hasOwnProperty(name) && 
                name !== 'style'
            ) {
                this[name] = opts[name];
            }
        }

        this.id = opts.id || guid();

        /**
         * @type {module:zrender/graphic/Style}
         */
        this.style = new Style(opts.style);

        this._rect = null;
        // Shapes for ascade clipping.
        this.__clipShapes = [];

        // FIXME Stateful must be mixined after style is setted
        Stateful.call(this, opts);
    };

    Displayable.prototype = {
        
        constructor: Displayable,

        /**
         * 图形类型
         * Graphic element type
         * @type {string}
         */
        type: 'displayable',

        /**
         * Displayable 是否为脏，Painter 中会根据该标记判断是否需要是否需要重新绘制
         * Dirty flag. From which painter will determine if this displayable object needs brush
         * @name module:zrender/graphic/Displayable#__dirty
         * @type {boolean}
         */
        __dirty: true,

        /**
         * ZRender 实例对象，会在 displayable 添加到 zrender 实例中后自动赋值
         * ZRender instance will be assigned when displayable is associated with zrender
         * @name module:/zrender/graphic/Displayable#__zr
         * @type {module:zrender/ZRender}
         */
        __zr: null,

        /**
         * 图形是否忽略，为true时忽略图形的绘制以及事件触发
         * If ignore drawing and events of the displayable object
         * @name module:/zrender/graphic/ignore#__zr
         * @type {boolean}
         * @default false
         */
        ignore: false,

        /**
         * 图形是否可见，为true时不绘制图形，但是仍能触发鼠标事件
         * If ignore drawing of the displayable object. Mouse event will still be triggered
         * @name module:/zrender/graphic/invisible#__zr
         * @type {boolean}
         * @default false
         */
        invisible: false,

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
         * 是否可点击
         * @name module:/zrender/graphic/Displayable#clickable
         * @type {boolean}
         * @default false
         */
        clickable: false,

        /**
         * 是否可以hover
         * @name module:/zrender/graphic/Displayable#hoverable
         * @type {boolean}
         * @default true
         */
        hoverable: true,

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
            var clipShapes = this.__clipShapes;
            if (clipShapes) {
                for (var i = 0; i < clipShapes.length; i++) {
                    var clipShape = clipShapes[i];
                    var m;
                    if (clipShape.needTransform) {
                        m = clipShape.transform;
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
                        m = clipShape.invTransform;
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                }
            }
        },

        // Interface
        brush: function (ctx, state) {},

        // Interface
        getRect: function (style) {},

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
            return rectContain.contain(this.getRect(), coord[0], coord[1]);
        },

        /**
         * 标记图形元素为脏，并且在下一帧重绘
         * Mark displayable element dirty and refresh next frame
         */
        dirty: function () {
            this.__dirty = true;

            this._rect = null;
            // PENDING
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
         * 创建一个 Animator
         * @param  {string} path 子属性 path, 例如 'style'
         * @param  {boolean} [loop=false] 是否循环
         * @return {module:zrender/animation/Animation~Animator}
         */
        animate: function (path, loop) {
            if (this.__zr) {
                return this.__zr.animate(this, path, loop);
            }
        },

        /**
         * 图形是否会触发事件
         * If displayable object binded any event
         * @return {boolean}
         */
        // TODO, 通过 bind 绑定的事件
        isSilent: function () {
            return !(
                this.hoverable || this.draggable || this.clickable
                || this.onmousemove || this.onmouseover || this.onmouseout
                || this.onmousedown || this.onmouseup || this.onclick
                || this.ondragenter || this.ondragover || this.ondragleave
                || this.ondrop
            );
        }
    };

    zrUtil.inherits(Displayable, Eventful);
    zrUtil.inherits(Displayable, Transformable);
    zrUtil.inherits(Displayable, RectText);
    zrUtil.inherits(Displayable, Stateful);

    return Displayable;
});