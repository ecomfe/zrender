/**
 * @file Manages SVG shadow elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import Displayable from '../../graphic/Displayable';
import { PathStyleProps } from '../../graphic/Path';
import { Dictionary } from '../../core/types';

type DisplayableExtended = Displayable & {
    _shadowDom: SVGElement
}
/**
 * Manages SVG shadow elements.
 *
 */
export default class ShadowManager extends Definable {

    private _shadowDomMap: Dictionary<SVGFilterElement> = {}
    private _shadowDomPool: SVGFilterElement[] = []

    constructor(zrId: number, svgRoot: SVGElement) {
        super(zrId, svgRoot, ['filter'], '__filter_in_use__', '_shadowDom');
    }

    /**
     * Add a new shadow tag in <defs>
     *
     * @param displayable  zrender displayable element
     * @return created DOM
     */
    private _getFromPool(): SVGFilterElement {
        let shadowDom = this._shadowDomPool.pop();    // Try to get one from trash.
        if (!shadowDom) {
            shadowDom = this.createElement('filter') as SVGFilterElement;
            shadowDom.setAttribute('id', 'zr' + this._zrId + '-shadow-' + this.nextId++);
            const domChild = this.createElement('feDropShadow')
            shadowDom.appendChild(domChild);
            this.addDom(shadowDom);
        }

        return shadowDom;
    }


    /**
     * Update shadow.
     */
    update(svgElement: SVGElement, displayable: Displayable) {
        const style = displayable.style;
        if (hasShadow(style)) {
            // Try getting shadow from cache.
            const shadowKey = getShadowKey(displayable);
            let shadowDom = (displayable as DisplayableExtended)._shadowDom = this._shadowDomMap[shadowKey];
            if (!shadowDom) {
                shadowDom = this._getFromPool();
                this._shadowDomMap[shadowKey] = shadowDom;
            }
            this.updateDom(svgElement, displayable, shadowDom);
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
        if ((displayable as DisplayableExtended)._shadowDom != null) {
            (displayable as DisplayableExtended)._shadowDom = null;
            svgElement.style.filter = '';
        }
    }


    /**
     * Update shadow dom
     *
     * @param displayable  zrender displayable element
     * @param shadowDom DOM to update
     */
    updateDom(svgElement: SVGElement, displayable: Displayable, shadowDom: SVGElement) {
        let domChild = shadowDom.children[0];

        const style = displayable.style;
        const globalScale = displayable.getGlobalScale();
        const scaleX = globalScale[0];
        const scaleY = globalScale[1];
        if (!scaleX || !scaleY) {
            return;
        }

        // TODO: textBoxShadowBlur is not supported yet
        let offsetX = style.shadowOffsetX || 0;
        let offsetY = style.shadowOffsetY || 0;
        let blur = style.shadowBlur;
        let color = style.shadowColor;

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
        shadowDom.setAttribute('x', '-100%');
        shadowDom.setAttribute('y', '-100%');
        shadowDom.setAttribute('width', '300%');
        shadowDom.setAttribute('height', '300%');

        // Store dom element in shadow, to avoid creating multiple
        // dom instances for the same shadow element
        (displayable as DisplayableExtended)._shadowDom = shadowDom;

        const id = shadowDom.getAttribute('id');
        svgElement.style.filter = 'url(#' + id + ')';
    }

    removeUnused() {
        const defs = this.getDefs(false);
        if (!defs) {
            // Nothing to remove
            return;
        }
        let shadowDomsPool = this._shadowDomPool;

        // let currentUsedShadow = 0;
        for (let key in this._shadowDomMap) {
            const dom = this._shadowDomMap[key];
            shadowDomsPool.push(dom);
            // currentUsedShadow++;
        }

        // Reset the map.
        this._shadowDomMap = {};
    }
}


function hasShadow(style: PathStyleProps) {
    // TODO: textBoxShadowBlur is not supported yet
    return style
        && (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY);
}

function getShadowKey(displayable: Displayable) {
    const style = displayable.style;
    const globalScale = displayable.getGlobalScale();
    return [
        style.shadowColor,
        (style.shadowBlur || 0).toFixed(2), // Reduce the precision
        (style.shadowOffsetX || 0).toFixed(2),
        (style.shadowOffsetY || 0).toFixed(2),
        globalScale[0],
        globalScale[1]
    ].join(',');
}