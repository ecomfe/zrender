import * as util from './core/util';
import env from './core/env';
import Group from './graphic/Group';
import Element from './Element';

// Use timsort because in most case elements are partially sorted
// https://jsfiddle.net/pissang/jr4x7mdm/8/
import timsort from './core/timsort';
import Displayable from './graphic/Displayable';
import { Path } from './export';

function shapeCompareFunc(a: Displayable, b: Displayable) {
    if (a.zlevel === b.zlevel) {
        if (a.z === b.z) {
            // if (a.z2 === b.z2) {
            //     // FIXME Slow has renderidx compare
            //     // http://stackoverflow.com/questions/20883421/sorting-in-javascript-should-every-compare-function-have-a-return-0-statement
            //     // https://github.com/v8/v8/blob/47cce544a31ed5577ffe2963f67acb4144ee0232/src/js/array.js#L1012
            //     return a.__renderidx - b.__renderidx;
            // }
            return a.z2 - b.z2;
        }
        return a.z - b.z;
    }
    return a.zlevel - b.zlevel;
}

export default class Storage {

    private _roots: Element[] = []

    private _displayList: Displayable[] = []

    private _displayListLen = 0

    traverse<T>(
        cb: (this: T, el: Element) => void,
        context?: T
    ) {
        for (let i = 0; i < this._roots.length; i++) {
            this._roots[i].traverse(cb, context);
        }
    }

    /**
     * 返回所有图形的绘制队列
     * @param update 是否在返回前更新该数组
     * @param includeIgnore 是否包含 ignore 的数组, 在 update 为 true 的时候有效
     */
    getDisplayList(update?: boolean, includeIgnore?: boolean): Displayable[] {
        includeIgnore = includeIgnore || false;
        if (update) {
            this.updateDisplayList(includeIgnore);
        }
        return this._displayList;
    }

    /**
     * 更新图形的绘制队列。
     * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
     * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
     */
    updateDisplayList(includeIgnore?: boolean) {
        this._displayListLen = 0;

        const roots = this._roots;
        const displayList = this._displayList;
        for (let i = 0, len = roots.length; i < len; i++) {
            this._updateAndAddDisplayable(roots[i], [], includeIgnore);
        }

        displayList.length = this._displayListLen;

        env.canvasSupported && timsort(displayList, shapeCompareFunc);
    }

    private _updateAndAddDisplayable(
        el: Element,
        clipPaths: Path[],
        includeIgnore?: boolean
    ) {

        if (el.ignore && !includeIgnore) {
            return;
        }

        el.beforeUpdate();
        if (el.__dirty) {
            el.update();
        }
        el.afterUpdate();

        const userSetClipPath = el.getClipPath();
        if (userSetClipPath) {
            clipPaths = clipPaths.slice();
            let currentClipPath = userSetClipPath;
            let parentClipPath = el;
            // Recursively add clip path
            while (currentClipPath) {
                // clipPath 的变换是基于使用这个 clipPath 的元素
                // TODO: parent should be group type.
                currentClipPath.parent = parentClipPath as Group;
                currentClipPath.updateTransform();

                clipPaths.push(currentClipPath);

                parentClipPath = currentClipPath;
                currentClipPath = currentClipPath.getClipPath()!;
            }
        }

        // ZRText and Group may use children
        if ((el as Group).childrenRef) { 
            const children = (el as Group).childrenRef();

            for (let i = 0; i < children.length; i++) {
                const child = children[i];

                // Force to mark as dirty if group is dirty
                if (el.__dirty) {
                    child.markRedraw();
                }

                this._updateAndAddDisplayable(child, clipPaths, includeIgnore);
            }

            // Mark group clean here
            el.__dirty = 0;

        }
        else {
            const disp = el as Displayable;
            // Element is displayable
            if (clipPaths && clipPaths.length) {
                disp.__clipPaths = clipPaths;
            }
            else if (disp.__clipPaths && disp.__clipPaths.length > 0) {
                disp.__clipPaths = [];
            }

            this._displayList[this._displayListLen++] = disp;
        }

        // Add attached text element and guide line.
        const textGuide = el.getTextGuideLine();
        if (textGuide) {
            this._updateAndAddDisplayable(textGuide, clipPaths, includeIgnore);
        }

        const textEl = el.getTextContent();
        if (textEl) {
            this._updateAndAddDisplayable(textEl, clipPaths, includeIgnore);
        }
    }

    /**
     * 添加图形(Displayable)或者组(Group)到根节点
     */
    addRoot(el: Element) {
        if (el.__zr && el.__zr.storage === this) {
            return;
        }

        this._roots.push(el);
    }

    /**
     * 删除指定的图形(Displayable)或者组(Group)
     * @param el
     */
    delRoot(el: Element | Element[]) {

        if (el instanceof Array) {
            for (let i = 0, l = el.length; i < l; i++) {
                this.delRoot(el[i]);
            }
            return;
        }

        const idx = util.indexOf(this._roots, el);
        if (idx >= 0) {
            this._roots.splice(idx, 1);
        }
    }

    delAllRoots() {
        this._roots = [];
        this._displayList = [];
        this._displayListLen = 0;

        return;
    }

    getRoots() {
        return this._roots;
    }

    /**
     * 清空并且释放Storage
     */
    dispose() {
        this._displayList = [];
        this._roots = [];
    }

    displayableSortFunc = shapeCompareFunc
}