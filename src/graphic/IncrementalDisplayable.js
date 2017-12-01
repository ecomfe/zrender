/**
 * Displayable for incremental rendering. It will be rendered in a separate layer
 * IncrementalDisplay have too main methods. `clearDisplayables` and `addDisplayables`
 * addDisplayables will render the added displayables incremetally.
 * clearDisplayables will clear the layer. 
 * Notice: Added displaybles can't be modified and removed.
 */
import { inherits } from '../core/util';
import Displayble from './Displayable';
import BoundingRect from '../core/BoundingRect';

// TODO Style override ?
function IncrementalDisplayble(opts) {
    
    Displayble.call(this, opts);

    this._displayables = [];

    this._cursor = 0;
}

IncrementalDisplayble.prototype.isIncremental = true;

IncrementalDisplayble.prototype.isFirstFrame = function () {
    return this._cursor === 0;
};

IncrementalDisplayble.prototype.clearDisplaybles = function () {
    this._displayables = [];
    this._cursor = 0;
    this.dirty();
};

IncrementalDisplayble.prototype.addDisplayable = function (displayable) {
    this._displayables.push(displayable);
    this.dirty();
};

IncrementalDisplayble.prototype.addDisplayables = function (displayables) {
    for (var i = 0; i < displayables.length; i++) {
        this._displayables.push(displayables[i]);
    }
    this.dirty();
};

IncrementalDisplayble.prototype.update = function () {
    this.updateTransform();
    for (var i = this._cursor; i < this._displayables.length; i++) {
        var displayable = this._displayables[i];
        // PENDING
        displayable.parent = this;
        displayable.update();
        displayable.parent = null;
    }
};

IncrementalDisplayble.prototype.brush = function (ctx, prevEl) {
    for (var i = this._cursor; i < this._displayables.length; i++) {
        this._displayables[i].brush(ctx, i === this._cursor ? null : this._displayables[i - 1]);
    }
    this._cursor = i;
};

var m = [];
IncrementalDisplayble.prototype.getBoundingRect = function () {
    if (!this._rect) {
        var rect = new BoundingRect(Infinity, Infinity, -Infinity, -Infinity);
        for (var i = 0; i < this._displayables.length; i++) {
            var displayable = this._displayables[i];
            var childRect = displayable.getBoundingRect().clone();
            if (displayable.needLocalTransform()) {
                childRect.applyTrasnform(displayable.getLocalTransform(m));
            }
            rect.union(childRect);
        }
        this._rect = rect;
    }
    return this._rect;
};

IncrementalDisplayble.prototype.contain = function (x, y) {
    var localPos = this.transformCoordToLocal(x, y);
    var rect = this.getBoundingRect();

    if (rect.contain(localPos[0], localPos[1])) {
        for (var i = 0; i < this._displayables.length; i++) {
            var displayable = this._displayables[i];
            if (displayable.contain(x, y)) {
                return true;
            }
        }
    }
    return false;
};

inherits(IncrementalDisplayble, Displayble);

export default IncrementalDisplayble;