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

    this._temporaryDisplayables = [];

    this._cursor = 0;

    this._needsClear = true;
}

IncrementalDisplayble.prototype.isIncremental = true;

IncrementalDisplayble.prototype.needsClear = function () {
    return this._needsClear;
};

IncrementalDisplayble.prototype.clearDisplaybles = function () {
    this._displayables = [];
    this._temporaryDisplayables = [];
    this._cursor = 0;
    this.dirty();
    this._needsClear = true;
};

IncrementalDisplayble.prototype.addDisplayable = function (displayable, notPersistent) {
    if (notPersistent) {
        this._temporaryDisplayables.push(displayable);
    }
    else {
        this._displayables.push(displayable);
    }
    this.dirty();
};

IncrementalDisplayble.prototype.addDisplayables = function (displayables, notPersistent) {
    notPersistent = notPersistent || false;
    for (var i = 0; i < displayables.length; i++) {
        this.addDisplayable(displayables[i], notPersistent);
    }
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
    for (var i = 0; i < this._temporaryDisplayables.length; i++) {
        var displayable = this._temporaryDisplayables[i];
        // PENDING
        displayable.parent = this;
        displayable.update();
        displayable.parent = null;
    }
};

IncrementalDisplayble.prototype.brush = function (ctx, prevEl) {
    // Render persistant displayables.
    for (var i = this._cursor; i < this._displayables.length; i++) {
        this._displayables[i].brush(ctx, i === this._cursor ? null : this._displayables[i - 1]);
    }
    this._cursor = i;
    // Render temporary displayables.
    for (var i = 0; i < this._temporaryDisplayables.length; i++) {
        this._temporaryDisplayables[i].brush(ctx, i === 0 ? null : this._temporaryDisplayables[i - 1]);
    }

    this._temporaryDisplayables = [];
    this._needsClear = false;
};

var m = [];
IncrementalDisplayble.prototype.getBoundingRect = function () {
    if (!this._rect) {
        var rect = new BoundingRect(Infinity, Infinity, -Infinity, -Infinity);
        for (var i = 0; i < this._displayables.length; i++) {
            var displayable = this._displayables[i];
            var childRect = displayable.getBoundingRect().clone();
            if (displayable.needLocalTransform()) {
                childRect.applyTransform(displayable.getLocalTransform(m));
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