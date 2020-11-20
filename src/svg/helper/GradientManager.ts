/**
 * @file Manages SVG gradient elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import * as zrUtil from '../../core/util';
import * as colorTool from '../../tool/color';
import Displayable from '../../graphic/Displayable';
import { GradientObject } from '../../graphic/Gradient';
import { LinearGradientObject } from '../../graphic/LinearGradient';
import { RadialGradientObject } from '../../graphic/RadialGradient';

function isLinearGradient(value: GradientObject): value is LinearGradientObject {
    return value.type === 'linear';
}

function isRadialGradient(value: GradientObject): value is RadialGradientObject {
    return value.type === 'radial';
}

function isGradient(value: GradientObject | string): value is GradientObject {
    return value && (
        (value as GradientObject).type === 'linear'
        || (value as GradientObject).type === 'radial'
    );
}


type GradientObjectExtended = GradientObject & {
    __dom: SVGElement
}

/**
 * Manages SVG gradient elements.
 *
 * @param   zrId    zrender instance id
 * @param   svgRoot root of SVG document
 */
export default class GradientManager extends Definable {

    constructor(zrId: number, svgRoot: SVGElement) {
        super(zrId, svgRoot, ['linearGradient', 'radialGradient'], '__gradient_in_use__');
    }


    /**
     * Create new gradient DOM for fill or stroke if not exist,
     * but will not update gradient if exists.
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
                let value = displayable.style[fillOrStroke] as GradientObject;
                if (isGradient(value)) {
                    const gradient = value as GradientObjectExtended;
                    const defs = that.getDefs(true);

                    // Create dom in <defs> if not exists
                    let dom;
                    if (gradient.__dom) {
                        // Gradient exists
                        dom = gradient.__dom;
                        if (!defs.contains(gradient.__dom)) {
                            // __dom is no longer in defs, recreate
                            that.addDom(dom);
                        }
                    }
                    else {
                        // New dom
                        dom = that.add(gradient);
                    }

                    that.markUsed(displayable);

                    const id = dom.getAttribute('id');
                    svgElement.setAttribute(fillOrStroke, 'url(#' + id + ')');
                }
            });
        }
    }


    /**
     * Add a new gradient tag in <defs>
     *
     * @param   gradient zr gradient instance
     */
    add(gradient: GradientObject): SVGElement {
        let dom;
        if (isLinearGradient(gradient)) {
            dom = this.createElement('linearGradient');
        }
        else if (isRadialGradient(gradient)) {
            dom = this.createElement('radialGradient');
        }
        else {
            zrUtil.logError('Illegal gradient type.');
            return null;
        }

        // Set dom id with gradient id, since each gradient instance
        // will have no more than one dom element.
        // id may exists before for those dirty elements, in which case
        // id should remain the same, and other attributes should be
        // updated.
        gradient.id = gradient.id || this.nextId++;
        dom.setAttribute('id', 'zr' + this._zrId
            + '-gradient-' + gradient.id);

        this.updateDom(gradient, dom);
        this.addDom(dom);

        return dom;
    }


    /**
     * Update gradient.
     *
     * @param gradient zr gradient instance or color string
     */
    update(gradient: GradientObject | string) {
        if (!isGradient(gradient)) {
            return;
        }

        const that = this;
        this.doUpdate(gradient, function () {
            const dom = (gradient as GradientObjectExtended).__dom;
            if (!dom) {
                return;
            }

            const tagName = dom.tagName;
            const type = gradient.type;
            if (type === 'linear' && tagName === 'linearGradient'
                || type === 'radial' && tagName === 'radialGradient'
            ) {
                // Gradient type is not changed, update gradient
                that.updateDom(gradient, (gradient as GradientObjectExtended).__dom);
            }
            else {
                // Remove and re-create if type is changed
                that.removeDom(gradient);
                that.add(gradient);
            }
        });
    }


    /**
     * Update gradient dom
     *
     * @param gradient zr gradient instance
     * @param dom DOM to update
     */
    updateDom(gradient: GradientObject, dom: SVGElement) {
        if (isLinearGradient(gradient)) {
            dom.setAttribute('x1', gradient.x + '');
            dom.setAttribute('y1', gradient.y + '');
            dom.setAttribute('x2', gradient.x2 + '');
            dom.setAttribute('y2', gradient.y2 + '');
        }
        else if (isRadialGradient(gradient)) {
            dom.setAttribute('cx', gradient.x + '');
            dom.setAttribute('cy', gradient.y + '');
            dom.setAttribute('r', gradient.r + '');
        }
        else {
            zrUtil.logError('Illegal gradient type.');
            return;
        }

        if (gradient.global) {
            // x1, x2, y1, y2 in range of 0 to canvas width or height
            dom.setAttribute('gradientUnits', 'userSpaceOnUse');
        }
        else {
            // x1, x2, y1, y2 in range of 0 to 1
            dom.setAttribute('gradientUnits', 'objectBoundingBox');
        }

        // Remove color stops if exists
        dom.innerHTML = '';

        // Add color stops
        const colors = gradient.colorStops;
        for (let i = 0, len = colors.length; i < len; ++i) {
            const stop = this.createElement('stop');
            stop.setAttribute('offset', colors[i].offset * 100 + '%');

            const color = colors[i].color;
            if (color.indexOf('rgba') > -1) {
                // Fix Safari bug that stop-color not recognizing alpha #9014
                const opacity = colorTool.parse(color)[3];
                const hex = colorTool.toHex(color);

                // stop-color cannot be color, since:
                // The opacity value used for the gradient calculation is the
                // *product* of the value of stop-opacity and the opacity of the
                // value of stop-color.
                // See https://www.w3.org/TR/SVG2/pservers.html#StopOpacityProperty
                stop.setAttribute('stop-color', '#' + hex);
                stop.setAttribute('stop-opacity', opacity + '');
            }
            else {
                stop.setAttribute('stop-color', colors[i].color);
            }

            dom.appendChild(stop);
        }

        // Store dom element in gradient, to avoid creating multiple
        // dom instances for the same gradient element
        (gradient as GradientObject as GradientObjectExtended).__dom = dom;
    }

    /**
     * Mark a single gradient to be used
     *
     * @param displayable displayable element
     */
    markUsed(displayable: Displayable) {
        if (displayable.style) {
            let gradient = displayable.style.fill as GradientObject as GradientObjectExtended;
            if (gradient && gradient.__dom) {
                super.markDomUsed(gradient.__dom);
            }

            gradient = displayable.style.stroke as GradientObject as GradientObjectExtended;
            if (gradient && gradient.__dom) {
                super.markDomUsed(gradient.__dom);
            }
        }
    }


}