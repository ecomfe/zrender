// TODO Draggable for group
// FIXME Draggable on element which has parent rotation or scale
define(function (require) {

    var config = require('../config');
    var EVENT = config.EVENT;

    function Draggable() {

        this.on(EVENT.MOUSEDOWN, this._dragStart, this);
        this.on(EVENT.MOUSEMOVE, this._drag, this);
        this.on(EVENT.MOUSEUP, this._dragEnd, this);
        this.on(EVENT.GLOBALOUT, this._dragEnd, this);
        // this._dropTarget = null;
        // this._draggingTarget = null;

        // this._x = 0;
        // this._y = 0;
    }

    Draggable.prototype = {

        constructor: Draggable,

        _dragStart: function (e) {
            var draggingTarget = e.target;
            if (draggingTarget && draggingTarget.draggable) {
                this._draggingTarget = draggingTarget;
                this._x = e.offsetX;
                this._y = e.offsetY;

                this._dispatch(draggingTarget, EVENT.DRAGSTART, e.event);
            }
        },

        _drag: function (e) {
            var draggingTarget = this._draggingTarget;
            if (draggingTarget) {

                var x = e.offsetX;
                var y = e.offsetY;

                var dx = x - this._x;
                var dy = y - this._y;
                this._x = x;
                this._y = y;

                draggingTarget.drift(dx, dy);
                this._dispatch(draggingTarget, EVENT.DRAG, e.event);

                var dropTarget = this._findHover(x, y, draggingTarget);
                var lastDropTarget = this._dropTarget;
                this._dropTarget = dropTarget;

                if (draggingTarget !== dropTarget) {
                    if (lastDropTarget && dropTarget !== lastDropTarget) {
                        this._dispatch(lastDropTarget, EVENT.DRAGLEAVE, e.event);
                    }
                    if (dropTarget && dropTarget !== lastDropTarget) {
                        this._dispatch(dropTarget, EVENT.DRAGENTER, e.event);
                    }
                }
            }
        },

        _dragEnd: function (e) {
            this._dispatch(this._draggingTarget, EVENT.DRAGEND, e.event);

            if (this._dropTarget) {
                this._dispatch(this._dropTarget, EVENT.DROP, e.event);
            }

            this._draggingTarget = null;
            this._dropTarget = null;
        }
    };

    return Draggable;
});