/**
 * Text element
 * @module zrender/graphic/Text
 *
 * TODO Wrapping
 */

define(function (require) {
    
    var Displayable = require('./Displayable');
    var zrUtil = require('../core/util');
    var textContain = require('../contain/text');

    var emptyRect = {
        x: 0, y: 0, width: 0, height: 0
    };
    /**
     * @alias zrender/graphic/Text
     * @extends module:zrender/graphic/Displayable
     * @constructor
     * @param {Object} opts
     */
    var Text = function (opts) {
        Displayable.call(this, opts);
    };

    Text.prototype = {

        constructor: Text,

        type: 'text',

        brush: function (ctx) {

            this.beforeBrush(ctx);
            // FIXME STROKE
            this.drawRectText(ctx, emptyRect, this.getRect());

            this.afterBrush(ctx);
        },

        getRect: function () {
            if (! this._rect) {
                var style = this.style;
                this._rect = textContain.getRect(
                    style.text, style.textFont, style.textAlign, style.textBaseline
                );
            }
            return this._rect;
        }
    };

    return Text;
});