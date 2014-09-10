/**
 * Path 代理，可以在`buildPath`中用于替代`ctx`, 会保存每个path操作的命令到pathArray属性中
 * 可以用于 isInsidePath 判断以及获取boundingRect
 * 
 * @module zrender/shape/util/PathProxy
 * @author pissang (http://www.github.com/pissang)
 * 
 * @example
 *     var SomeShape = function() {
 *         this._pathProxy = new PathProxy();
 *     }
 *     SomeShape.prototype.buildPath = function(ctx, style) {
 *         this._pathProxy.begin(ctx);
 *             .moveTo(style.x, style.y);
 *             .lineTo(style.x1, style.y1);
 *         ...
 *             .closePath();
 *     },
 *     SomeShape.prototype.getRect = function(style) {
 *         if (!style._rect) {
 *             // 这里必须要在 buildPath 之后才能调用
 *             style._rect = this._pathProxy.getBoundingRect();
 *         }
 *         return this.style._rect;
 *     },
 *     SomeShape.prototype.isCover = function(x, y) {
 *         var rect = this.getRect(this.style);
 *         if (x >= rect.x
 *             && x <= (rect.x + rect.width)
 *             && y >= rect.y
 *             && y <= (rect.y + rect.height)
 *         ) {
 *                 return require('../tool/area').isInsidePath(this._pathProxy, x, y);
 *         }
 *     }
 */
define(function (require) {
    
    /**
     * @alias module:zrender/shape/tool/PathProxy
     * @constructor
     */
    var PathProxy = function () {

        /**
         * Path描述的数组，用于`isInsidePath`的判断
         * @type {Array.<Object>}
         */
        this.pathArray = [];

        this._ctx = null;
    }

    /**
     * 获取Path包围盒
     * @return {Object}
     */
    PathProxy.prototype.getBoundingRect = function () {

    }

    /**
     * @param  {CanvasRenderingContext2D} ctx
     * @return {PathProxy}
     */
    PathProxy.prototype.begin = function (ctx) {
        this._ctx = ctx || null;
        // 清空pathArray
        this._pathProxy.length = 0;

        return this;
    }

    /**
     * @param  {number} x
     * @param  {number} y
     * @return {PathProxy}
     */
    PathProxy.prototype.moveTo = function (x, y) {
        this._pathProxy.push({
            command: 'M',
            points: [x, y]
        });
        if (this._ctx) {
            this._ctx.moveTo(x, y);
        }
        return this;
    }

    /**
     * @param  {number} x
     * @param  {number} y
     * @return {PathProxy}
     */
    PathProxy.prototype.lineTo = function (x, y) {
        this._pathProxy.push({
            command: 'L',
            points: [x, y]
        });
        if (this._ctx) {
            this._ctx.lineTo(x, y);
        }
        return this;
    }

    /**
     * @param  {number} x1
     * @param  {number} y1
     * @param  {number} x2
     * @param  {number} y2
     * @param  {number} x3
     * @param  {number} y3
     * @return {PathProxy}
     */
    PathProxy.prototype.bezierCurveTo = function (x1, y1, x2, y2, x3, y3) {
        this._pathProxy.push({
            command: 'C',
            points: [x1, y1, x2, y2, x3, y3]
        });
        if (this._ctx) {
            this._ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
        return this;
    }

    /**
     * @param  {number} x1
     * @param  {number} y1
     * @param  {number} x2
     * @param  {number} y2
     * @return {PathProxy}
     */
    PathProxy.prototype.quadraticCurveTo = function (x1, y1, x2, y2) {
        this._pathProxy.push({
            command: 'Q',
            points: [x1, y1, x2, y2]
        });
        if (this._ctx) {
            this._ctx.quadraticCurveTo(x1, y1, x2, y2);
        }
        return this;
    }

    /**
     * @param  {number} cx
     * @param  {number} cy
     * @param  {number} r
     * @param  {number} startAngle
     * @param  {number} endAngle
     * @param  {boolean} anticlockwise
     * @return {PathProxy}
     */
    PathProxy.prototype.arc = function (cx, cy, r, startAngle, endAngle, anticlockwise) {
        this._pathProxy.push({
            command: 'A',
            points: [cx, cy, r, r, startAngle, endAngle - startAngle, 0, anticlockwise ? 0 : 1];
        });
        if (this._ctx) {
            this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);
        }
        return this;
    }

    // TODO
    PathProxy.prototype.arcTo = function (x1, y1, x2, y2, radius) {
        if (this._ctx) {
            this._ctx.arcTo(x1, y1, x2, y2, radius);
        }
        return this;
    }

    // TODO
    PathProxy.prototype.rect = function (x, y, w, h) {
        if (this._ctx) {
            this._ctx.rect(x, y, w, h);
        }
        return this;
    }

    /**
     * @return {PathProxy}
     */
    PathProxy.prototype.closePath = function () {
        this._pathProxy.push({
            command: 'z'
        });
        if (this._ctx) {
            this._ctx.closePath();
        }
        return this;
    }

    return PathProxy;
});