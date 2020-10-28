/**
 * @file Manages SVG clipPath elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import * as zrUtil from '../../core/util';
import Displayable from '../../graphic/Displayable';
import Path from '../../graphic/Path';
import {SVGProxy} from '../graphic';
import { Dictionary } from '../../core/types';
import { isClipPathChanged } from '../../canvas/helper';

type PathExtended = Path & {
    _dom: SVGElement
}

function generateClipPathsKey(clipPaths: Path[]) {
    let key: number[] = [];
    if (clipPaths) {
        for (let i = 0; i < clipPaths.length; i++) {
            const clipPath = clipPaths[i];
            key.push(clipPath.id);
        }
    }
    return key.join(',');
}

export function hasClipPath(displayable: Displayable) {
    const clipPaths = displayable.__clipPaths;
    return clipPaths && clipPaths.length > 0;
}
/**
 * Manages SVG clipPath elements.
 */
export default class ClippathManager extends Definable {

    private _refGroups: Dictionary<SVGElement> = {};
    private _keyDuplicateCount: Dictionary<number> = {};

    constructor(zrId: number, svgRoot: SVGElement) {
        super(zrId, svgRoot, 'clipPath', '__clippath_in_use__');
    }

    markAllUnused() {
        super.markAllUnused();
        for (let key in this._refGroups) {
            this.markDomUnused(this._refGroups[key]);
        }
        this._keyDuplicateCount = {};
    }


    private _getClipPathGroup(displayable: Displayable, prevDisplayable: Displayable) {
        if (!hasClipPath(displayable)) {
            return;
        }
        const clipPaths = displayable.__clipPaths;

        const keyDuplicateCount = this._keyDuplicateCount;
        let clipPathKey = generateClipPathsKey(clipPaths);
        if (isClipPathChanged(clipPaths, prevDisplayable && prevDisplayable.__clipPaths)) {
            keyDuplicateCount[clipPathKey] = keyDuplicateCount[clipPathKey] || 0;
            keyDuplicateCount[clipPathKey] && (clipPathKey += '-' + keyDuplicateCount[clipPathKey]);
            keyDuplicateCount[clipPathKey]++;
        }

        return this._refGroups[clipPathKey]
            || (this._refGroups[clipPathKey] = this.createElement('g'));
    }

    /**
     * Update clipPath.
     *
     * @param displayable displayable element
     */
    update(displayable: Displayable, prevDisplayable: Displayable) {
        const clipGroup = this._getClipPathGroup(displayable, prevDisplayable);
        if (clipGroup) {
            this.markDomUsed(clipGroup);
            this.updateDom(clipGroup, displayable.__clipPaths);
        }
        return clipGroup;
    };


    /**
     * Create an SVGElement of displayable and create a <clipPath> of its
     * clipPath
     */
    updateDom(parentEl: SVGElement, clipPaths: Path[]) {
        if (clipPaths && clipPaths.length > 0) {
            // Has clipPath, create <clipPath> with the first clipPath
            const defs = this.getDefs(true);
            const clipPath = clipPaths[0] as PathExtended;
            let clipPathEl;
            let id;

            if (clipPath._dom) {
                // Use a dom that is already in <defs>
                id = clipPath._dom.getAttribute('id');
                clipPathEl = clipPath._dom;

                // Use a dom that is already in <defs>
                if (!defs.contains(clipPathEl)) {
                    // This happens when set old clipPath that has
                    // been previously removed
                    defs.appendChild(clipPathEl);
                }
            }
            else {
                // New <clipPath>
                id = 'zr' + this._zrId + '-clip-' + this.nextId;
                ++this.nextId;
                clipPathEl = this.createElement('clipPath');
                clipPathEl.setAttribute('id', id);
                defs.appendChild(clipPathEl);

                clipPath._dom = clipPathEl;
            }

            // Build path and add to <clipPath>
            const svgProxy = this.getSvgProxy(clipPath);
            (svgProxy as SVGProxy<Path>).brush(clipPath);

            const pathEl = this.getSvgElement(clipPath);

            clipPathEl.innerHTML = '';
            clipPathEl.appendChild(pathEl);

            parentEl.setAttribute('clip-path', 'url(#' + id + ')');

            if (clipPaths.length > 1) {
                // Make the other clipPaths recursively
                this.updateDom(clipPathEl, clipPaths.slice(1));
            }
        }
        else {
            // No clipPath
            if (parentEl) {
                parentEl.setAttribute('clip-path', 'none');
            }
        }
    };

    /**
     * Mark a single clipPath to be used
     *
     * @param displayable displayable element
     */
    markUsed(displayable: Displayable) {
        // displayable.__clipPaths can only be `null`/`undefined` or an non-empty array.
        if (displayable.__clipPaths) {
            zrUtil.each(displayable.__clipPaths, (clipPath: PathExtended) => {
                if (clipPath._dom) {
                    super.markDomUsed(clipPath._dom);
                }
            });
        }
    };

    removeUnused() {
        super.removeUnused();

        const newRefGroupsMap: Dictionary<SVGElement> = {};
        for (let key in this._refGroups) {
            const group = this._refGroups[key];
            if (!this.isDomUnused(group)) {
                newRefGroupsMap[key] = group;
            }
            else if (group.parentNode) {
                group.parentNode.removeChild(group);
            }
        }
        this._refGroups = newRefGroupsMap;
    }
}
