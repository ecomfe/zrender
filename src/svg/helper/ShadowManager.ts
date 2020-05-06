/**
 * @file Manages SVG shadow elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import Displayable from '../../graphic/Displayable';
import { PathStyleProps } from '../../graphic/Path';


type DisplayableExtended = Displayable & {
    _shadowDom: SVGElement
    _shadowDomId: number
}
/**
 * Manages SVG shadow elements.
 *
 */
export default class ShadowManager extends Definable {
    constructor(zrId: number, svgRoot: SVGElement) {
        super(zrId, svgRoot, ['filter'], '__filter_in_use__', '_shadowDom');
    }

    /**
     * Create new shadow DOM for fill or stroke if not exist,
     * but will not update shadow if exists.
     */
    addWithoutUpdate(
        svgElement: SVGElement, // SVG element to paint
        displayable: Displayable    // zrender displayable element
    ) {
        if (displayable && hasShadow(displayable.style)) {

            // Create dom in <defs> if not exists
            let dom: SVGElement;
            if ((displayable as DisplayableExtended)._shadowDom) {
                // Gradient exists
                dom = (displayable as DisplayableExtended)._shadowDom;

                const defs = this.getDefs(true);
                if (!defs.contains((displayable as DisplayableExtended)._shadowDom)) {
                    // _shadowDom is no longer in defs, recreate
                    this.addDom(dom);
                }
            }
            else {
                // New dom
                dom = this.add(displayable);
            }

            this.markUsed(displayable);

            const id = dom.getAttribute('id');
            svgElement.style.filter = 'url(#' + id + ')';
        }
    }


    /**
     * Add a new shadow tag in <defs>
     *
     * @param displayable  zrender displayable element
     * @return created DOM
     */
    add(displayable: Displayable): SVGElement {
        const dom = this.createElement('filter');

        // Set dom id with shadow id, since each shadow instance
        // will have no more than one dom element.
        // id may exists before for those dirty elements, in which case
        // id should remain the same, and other attributes should be
        // updated.
        (displayable as DisplayableExtended)._shadowDomId = (displayable as DisplayableExtended)._shadowDomId || this.nextId++;
        dom.setAttribute('id', 'zr' + this._zrId
            + '-shadow-' + (displayable as DisplayableExtended)._shadowDomId);

        this.updateDom(displayable, dom);
        this.addDom(dom);

        return dom;
    }


    /**
     * Update shadow.
     */
    update(svgElement: SVGElement, displayable: Displayable) {
        const style = displayable.style;
        if (hasShadow(style)) {
            const that = this;
            super.doUpdate(displayable, function () {
                that.updateDom(displayable, (displayable as DisplayableExtended)._shadowDom);
            });
        }
        else {
            // Remove shadow
            this.remove(svgElement, displayable);
        }
    }


    /**
     * Remove DOM and clear parent filter
     */
    remove(svgElement: SVGElement, displayable: Displayable) {
        if ((displayable as DisplayableExtended)._shadowDomId != null) {
            this.removeDom(svgElement);
            svgElement.style.filter = '';
        }
    }


    /**
     * Update shadow dom
     *
     * @param displayable  zrender displayable element
     * @param dom DOM to update
     */
    updateDom(displayable: Displayable, dom: SVGElement) {
        const domChildArr = dom.getElementsByTagName('feDropShadow');
        const domChild = domChildArr.length
            ? domChildArr[0]
            : this.createElement('feDropShadow');

        const style = displayable.style;
        const scaleX = displayable.scaleX || 1;
        const scaleY = displayable.scaleY || 1;

        // TODO: textBoxShadowBlur is not supported yet
        let offsetX;
        let offsetY;
        let blur;
        let color;
        if (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY) {
            offsetX = style.shadowOffsetX || 0;
            offsetY = style.shadowOffsetY || 0;
            blur = style.shadowBlur;
            color = style.shadowColor;
        }
        else if (style.textShadowBlur) {
            offsetX = style.textShadowOffsetX || 0;
            offsetY = style.textShadowOffsetY || 0;
            blur = style.textShadowBlur;
            color = style.textShadowColor;
        }
        else {
            // Remove shadow
            this.removeDom(dom);
            return;
        }

        domChild.setAttribute('dx', offsetX / scaleX + '');
        domChild.setAttribute('dy', offsetY / scaleY + '');
        domChild.setAttribute('flood-color', color);

        // Divide by two here so that it looks the same as in canvas
        // See: https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-shadowblur
        const stdDx = blur / 2 / scaleX;
        const stdDy = blur / 2 / scaleY;
        const stdDeviation = stdDx + ' ' + stdDy;
        domChild.setAttribute('stdDeviation', stdDeviation);

        // Fix filter clipping problem
        dom.setAttribute('x', '-100%');
        dom.setAttribute('y', '-100%');
        dom.setAttribute('width', Math.ceil(blur / 2 * 200) + '%');
        dom.setAttribute('height', Math.ceil(blur / 2 * 200) + '%');

        dom.appendChild(domChild);

        // Store dom element in shadow, to avoid creating multiple
        // dom instances for the same shadow element
        (displayable as DisplayableExtended)._shadowDom = dom;
    }

    /**
     * Mark a single shadow to be used
     *
     * @param displayable displayable element
     */
    markUsed(displayable: Displayable) {
        if ((displayable as DisplayableExtended)._shadowDom) {
            super.markDomUsed((displayable as DisplayableExtended)._shadowDom);
        }
    }

}


function hasShadow(style: PathStyleProps) {
    // TODO: textBoxShadowBlur is not supported yet
    return style
        && (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY);
}