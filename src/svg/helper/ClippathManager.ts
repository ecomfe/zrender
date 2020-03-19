/**
 * @file Manages SVG clipPath elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import * as zrUtil from '../../core/util';
import * as matrix from '../../core/matrix';
import Displayable from '../../graphic/Displayable';
import Path from '../../graphic/Path';
import {SVGProxy} from '../graphic';

type PathExtended = Path & {
    _dom: SVGElement
    _textDom: SVGElement
}
/**
 * Manages SVG clipPath elements.
 */
export default class ClippathManager extends Definable {
    constructor(zrId: number, svgRoot: SVGElement) {
        super(zrId, svgRoot, 'clipPath', '__clippath_in_use__');
    }

    /**
     * Update clipPath.
     *
     * @param displayable displayable element
     */
    update(displayable: Displayable) {
        const svgEl = this.getSvgElement(displayable);
        if (svgEl) {
            this.updateDom(svgEl, displayable.__clipPaths, false);
        }

        this.markUsed(displayable);
    };


    /**
     * Create an SVGElement of displayable and create a <clipPath> of its
     * clipPath
     */
    updateDom(
        parentEl: SVGElement,
        clipPaths: Path[],  // clipPaths of parent element
        isText: boolean // if parent element is Text
    ) {
        if (clipPaths && clipPaths.length > 0) {
            // Has clipPath, create <clipPath> with the first clipPath
            const defs = this.getDefs(true);
            const clipPath = clipPaths[0] as PathExtended;
            let clipPathEl;
            let id;

            const domKey: '_textDom' | '_dom' = isText ? '_textDom' : '_dom';

            if (clipPath[domKey]) {
                // Use a dom that is already in <defs>
                id = clipPath[domKey].getAttribute('id');
                clipPathEl = clipPath[domKey];

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

                clipPath[domKey] = clipPathEl;
            }

            // Build path and add to <clipPath>
            const svgProxy = this.getSvgProxy(clipPath);
            if (clipPath.transform
                && clipPath.parent.invTransform
                && !isText
            ) {
                /**
                 * If a clipPath has a parent with transform, the transform
                 * of parent should not be considered when setting transform
                 * of clipPath. So we need to transform back from parent's
                 * transform, which is done by multiplying parent's inverse
                 * transform.
                 */
                // Store old transform
                const transform = Array.prototype.slice.call(
                    clipPath.transform
                );

                // Transform back from parent, and brush path
                matrix.mul(
                    clipPath.transform,
                    clipPath.parent.invTransform,
                    clipPath.transform
                );
                (svgProxy as SVGProxy<Path>).brush(clipPath);

                // Set back transform of clipPath
                clipPath.transform = transform;
            }
            else {
                (svgProxy as SVGProxy<Path>).brush(clipPath);
            }

            const pathEl = this.getSvgElement(clipPath);

            clipPathEl.innerHTML = '';
            /**
             * Use `cloneNode()` here to appendChild to multiple parents,
             * which may happend when Text and other shapes are using the same
             * clipPath. Since Text will create an extra clipPath DOM due to
             * different transform rules.
             */
            clipPathEl.appendChild(pathEl.cloneNode());

            parentEl.setAttribute('clip-path', 'url(#' + id + ')');

            if (clipPaths.length > 1) {
                // Make the other clipPaths recursively
                this.updateDom(clipPathEl, clipPaths.slice(1), isText);
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
                if (clipPath._textDom) {
                    super.markDomUsed(clipPath._textDom);
                }
            });
        }
    };
}
