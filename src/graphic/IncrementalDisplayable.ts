/**
 * Displayable for incremental rendering. It will be rendered in a separate layer
 * IncrementalDisplay have two main methods. `clearDisplayables` and `addDisplayables`
 * addDisplayables will render the added displayables incremetally.
 *
 * It use a not clearFlag to tell the painter don't clear the layer if it's the first element.
 */
import Displayble from './Displayable';
import BoundingRect from '../core/BoundingRect';
import { MatrixArray } from '../core/matrix';

const m: MatrixArray = [];
// TODO Style override ?

export default class IncrementalDisplayble extends Displayble {

    notClear: boolean = true

    incremental = true

    private _displayables: Displayble[] = []
    private _temporaryDisplayables: Displayble[] = []

    private _cursor = 0

    clearDisplaybles() {
        this._displayables = [];
        this._temporaryDisplayables = [];
        this._cursor = 0;
        this.dirty();

        this.notClear = false;
    }

    addDisplayable(displayable: Displayble, notPersistent?: boolean) {
        if (notPersistent) {
            this._temporaryDisplayables.push(displayable);
        }
        else {
            this._displayables.push(displayable);
        }
        this.dirty();
    }

    addDisplayables(displayables: Displayble[], notPersistent?: boolean) {
        notPersistent = notPersistent || false;
        for (let i = 0; i < displayables.length; i++) {
            this.addDisplayable(displayables[i], notPersistent);
        }
    }

    eachPendingDisplayable(cb: (displayable: Displayble) => void) {
        for (let i = this._cursor; i < this._displayables.length; i++) {
            cb && cb(this._displayables[i]);
        }
        for (let i = 0; i < this._temporaryDisplayables.length; i++) {
            cb && cb(this._temporaryDisplayables[i]);
        }
    }

    update() {
        this.updateTransform();
        for (let i = this._cursor; i < this._displayables.length; i++) {
            const displayable = this._displayables[i];
            // PENDING
            displayable.parent = this;
            displayable.update();
            displayable.parent = null;
        }
        for (let i = 0; i < this._temporaryDisplayables.length; i++) {
            const displayable = this._temporaryDisplayables[i];
            // PENDING
            displayable.parent = this;
            displayable.update();
            displayable.parent = null;
        }
    }

    brush(ctx: CanvasRenderingContext2D) {
        let i;
        // Render persistant displayables.
        for (i = this._cursor; i < this._displayables.length; i++) {
            const displayable = this._displayables[i];
            displayable.beforeBrush && displayable.beforeBrush(ctx);
            displayable.brush(ctx, i === this._cursor ? null : this._displayables[i - 1]);
            displayable.afterBrush && displayable.afterBrush(ctx);
        }
        this._cursor = i;
        // Render temporary displayables.
        for (let i = 0; i < this._temporaryDisplayables.length; i++) {
            const displayable = this._temporaryDisplayables[i];
            displayable.beforeBrush && displayable.beforeBrush(ctx);
            displayable.brush(ctx, i === 0 ? null : this._temporaryDisplayables[i - 1]);
            displayable.afterBrush && displayable.afterBrush(ctx);
        }

        this._temporaryDisplayables = [];

        this.notClear = true;
    }

    getBoundingRect() {
        if (!this._rect) {
            const rect = new BoundingRect(Infinity, Infinity, -Infinity, -Infinity);
            for (let i = 0; i < this._displayables.length; i++) {
                const displayable = this._displayables[i];
                const childRect = displayable.getBoundingRect().clone();
                if (displayable.needLocalTransform()) {
                    childRect.applyTransform(displayable.getLocalTransform(m));
                }
                rect.union(childRect);
            }
            this._rect = rect;
        }
        return this._rect;
    }

    contain(x: number, y: number): boolean {
        const localPos = this.transformCoordToLocal(x, y);
        const rect = this.getBoundingRect();

        if (rect.contain(localPos[0], localPos[1])) {
            for (let i = 0; i < this._displayables.length; i++) {
                const displayable = this._displayables[i];
                if (displayable.contain(x, y)) {
                    return true;
                }
            }
        }
        return false;
    }

}