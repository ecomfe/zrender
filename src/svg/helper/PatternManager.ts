/**
 * @file Manages SVG pattern elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import * as zrUtil from '../../core/util';
import Displayable from '../../graphic/Displayable';
import {PatternObject} from '../../graphic/Pattern';
import {createOrUpdateImage} from '../../graphic/helper/image';
import WeakMap from '../../core/WeakMap';

function isPattern(value: PatternObject | string): value is PatternObject {
    return value && (!!(value as PatternObject).image || !!(value as PatternObject).svgElement);
}

const patternDomMap = new WeakMap<PatternObject, SVGElement>();

/**
 * Manages SVG pattern elements.
 *
 * @param   zrId    zrender instance id
 * @param   svgRoot root of SVG document
 */
export default class PatternManager extends Definable {

    constructor(zrId: number, svgRoot: SVGElement) {
        super(zrId, svgRoot, ['pattern'], '__pattern_in_use__');
    }


    /**
     * Create new pattern DOM for fill or stroke if not exist,
     * but will not update pattern if exists.
     *
     * @param svgElement   SVG element to paint
     * @param displayable  zrender displayable element
     */
    addWithoutUpdate(
        svgElement: SVGElement,
        displayable: Displayable
    ) {
        if (displayable && displayable.style) {
            const that = this;
            zrUtil.each(['fill', 'stroke'], function (fillOrStroke: 'fill' | 'stroke') {
                const pattern = displayable.style[fillOrStroke] as PatternObject;
                if (isPattern(pattern)) {
                    const defs = that.getDefs(true);

                    // Create dom in <defs> if not exists
                    let dom = patternDomMap.get(pattern);
                    if (dom) {
                        // Pattern exists
                        if (!defs.contains(dom)) {
                            // __dom is no longer in defs, recreate
                            that.addDom(dom);
                        }
                    }
                    else {
                        // New dom
                        dom = that.add(pattern);
                    }

                    that.markUsed(displayable);

                    const id = dom.getAttribute('id');
                    svgElement.setAttribute(fillOrStroke, 'url(#' + id + ')');
                }
            });
        }
    }


    /**
     * Add a new pattern tag in <defs>
     *
     * @param   pattern zr pattern instance
     */
    add(pattern: PatternObject): SVGElement {
        if (!isPattern(pattern)) {
            return;
        }

        let dom = this.createElement('pattern');

        pattern.id = pattern.id == null ? this.nextId++ : pattern.id;
        dom.setAttribute('id', 'zr' + this._zrId
            + '-pattern-' + pattern.id);

        dom.setAttribute('x', '0');
        dom.setAttribute('y', '0');
        dom.setAttribute('patternUnits', 'userSpaceOnUse');

        this.updateDom(pattern, dom);
        this.addDom(dom);

        return dom;
    }


    /**
     * Update pattern.
     *
     * @param pattern zr pattern instance or color string
     */
    update(pattern: PatternObject | string) {
        if (!isPattern(pattern)) {
            return;
        }

        const that = this;
        this.doUpdate(pattern, function () {
            const dom = patternDomMap.get(pattern);
            that.updateDom(pattern, dom);
        });
    }


    /**
     * Update pattern dom
     *
     * @param pattern zr pattern instance
     * @param patternDom DOM to update
     */
    updateDom(pattern: PatternObject, patternDom: SVGElement) {
        const svgElement = pattern.svgElement;

        if (svgElement instanceof SVGElement) {
            if (svgElement.parentNode !== patternDom) {
                patternDom.innerHTML = '';
                patternDom.appendChild(svgElement);

                patternDom.setAttribute('width', pattern.svgWidth + '');
                patternDom.setAttribute('height', pattern.svgHeight + '');
            }
        }
        else {
            let img: SVGElement;
            const prevImage = patternDom.getElementsByTagName('image');
            if (prevImage.length) {
                if (pattern.image) {
                    // Update
                    img = prevImage[0];
                }
                else {
                    // Remove
                    patternDom.removeChild(prevImage[0]);
                    return;
                }
            }
            else if (pattern.image) {
                // Create
                img = this.createElement('image');
            }

            if (img) {
                let imageSrc;
                if (typeof pattern.image === 'string') {
                    imageSrc = pattern.image;
                }
                else if (pattern.image instanceof HTMLImageElement) {
                    imageSrc = pattern.image.src;
                }
                else if (pattern.image instanceof HTMLCanvasElement) {
                    imageSrc = pattern.image.toDataURL();
                }

                if (imageSrc) {
                    img.setAttribute('href', imageSrc);
                    img.setAttribute('x', '0');
                    img.setAttribute('y', '0');

                    // No need to re-render so dirty is empty
                    const hostEl = {
                        dirty: () => {}
                    };
                    const createdImage = createOrUpdateImage(imageSrc, img as any, hostEl, img => {
                        patternDom.setAttribute('width', img.width + '');
                        patternDom.setAttribute('height', img.height + '');
                    });
                    if (createdImage && createdImage.width && createdImage.height) {
                        // Loaded before
                        patternDom.setAttribute('width', createdImage.width + '');
                        patternDom.setAttribute('height', createdImage.height + '');
                    }

                    patternDom.appendChild(img);
                }
            }
        }

        const x = pattern.x || 0;
        const y = pattern.y || 0;
        const rotation = (pattern.rotation || 0) / Math.PI * 180;
        const scaleX = pattern.scaleX || 1;
        const scaleY = pattern.scaleY || 1;
        const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX}, ${scaleY})`;
        patternDom.setAttribute('patternTransform', transform);
        patternDomMap.set(pattern, patternDom);
    }

    /**
     * Mark a single pattern to be used
     *
     * @param displayable displayable element
     */
    markUsed(displayable: Displayable) {
        if (displayable.style) {
            if (isPattern(displayable.style.fill)) {
                super.markDomUsed(patternDomMap.get(displayable.style.fill));
            }
            if (isPattern(displayable.style.stroke)) {
                super.markDomUsed(patternDomMap.get(displayable.style.stroke));
            }
        }
    }

}

type CachedImageObj = {
    width: number,
    height: number
};
