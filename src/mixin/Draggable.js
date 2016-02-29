// TODO Draggable for group
// FIXME Draggable on element which has parent rotation or scale
define(function (require) {
    function Draggable() {

        this.on('mousedown', this._dragStart, this);
        this.on('mousemove', this._drag, this);
        this.on('mouseup', this._dragEnd, this);
        this.on('globalout', this._dragEnd, this);
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
                draggingTarget.dragging = true;
                this._x = e.offsetX;
                this._y = e.offsetY;

                this._dispatchProxy(draggingTarget, 'dragstart', e.event);
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

                draggingTarget.drift(dx, dy, e);
                this._dispatchProxy(draggingTarget, 'drag', e.event);

                var dropTarget = this.findHover(x, y, draggingTarget);
                var lastDropTarget = this._dropTarget;
                this._dropTarget = dropTarget;

                if (draggingTarget !== dropTarget) {
                    if (lastDropTarget && dropTarget !== lastDropTarget) {
                        this._dispatchProxy(lastDropTarget, 'dragleave', e.event);
                    }
                    if (dropTarget && dropTarget !== lastDropTarget) {
                        this._dispatchProxy(dropTarget, 'dragenter', e.event);
                    }
                }
            }
        },

        _dragEnd: function (e) {
            var draggingTarget = this._draggingTarget;

            if (draggingTarget) {
                draggingTarget.dragging = false;
            }

            this._dispatchProxy(draggingTarget, 'dragend', e.event);

            if (this._dropTarget) {
                this._dispatchProxy(this._dropTarget, 'drop', e.event);
            }

            this._draggingTarget = null;
            this._dropTarget = null;
        }

    };

    return Draggable;
});