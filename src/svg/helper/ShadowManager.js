/**
 * @file Manages SVG shadow elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import * as zrUtil from '../../core/util';
import zrLog from '../../core/log';

/**
 * Manages SVG shadow elements.
 *
 * @class
 * @extends Definable
 * @param   {SVGElement} svgRoot root of SVG document
 */
function ShadowManager(svgRoot) {
    Definable.call(
        this,
        svgRoot,
        ['filter'],
        '__filter_in_use__'
    );
}


zrUtil.inherits(ShadowManager, Definable);


/**
 * Create new shadow DOM for fill or stroke if not exist,
 * but will not update shadow if exists.
 *
 * @param {SvgElement}  svgElement   SVG element to paint
 * @param {Displayable} displayable  zrender displayable element
 */
ShadowManager.prototype.addWithoutUpdate = function (
    svgElement,
    displayable
) {
    if (displayable && displayable.style && displayable.style.shadowBlur) {
        var style = displayable.style;

        // Create dom in <defs> if not exists
        var dom;
        if (style._shadowDom) {
            // Gradient exists
            dom = style._shadowDom;

            var defs = this.getDefs(true);
            if (!defs.contains(style._shadowDom)) {
                // _shadowDom is no longer in defs, recreate
                this.addDom(dom);
            }
        }
        else {
            // New dom
            dom = this.add(style);
        }

        this.markUsed(displayable);

        var id = dom.getAttribute('id');
        svgElement.style.filter = 'url(#' + id + ')';
    }
};


/**
 * Add a new shadow tag in <defs>
 *
 * @param  {Object} style element style
 * @return {SVGFilterElement} created DOM
 */
ShadowManager.prototype.add = function (style) {
    var dom = this.createElement('filter');

    // Set dom id with shadow id, since each shadow instance
    // will have no more than one dom element.
    // id may exists before for those dirty elements, in which case
    // id should remain the same, and other attributes should be
    // updated.
    style._shadowDomId = style._shadowDomId || this.nextId++;
    dom.setAttribute('id', 'zr-shadow-' + style._shadowDomId);

    this.updateDom(style, dom);
    this.addDom(dom);

    return dom;
};


/**
 * Update shadow.
 *
 * @param {Object} style element style
 */
ShadowManager.prototype.update = function (style) {
    var that = this;
    Definable.prototype.update.call(this, style, function () {
        that.updateDom(style, style._shadowDom);
    });
};


/**
 * Update shadow dom
 *
 * @param {Object} style element style
 * @param {SVGLinearGradientElement | SVGRadialGradientElement} dom
 *                            DOM to update
 */
ShadowManager.prototype.updateDom = function (style, dom) {
    var domChild = dom.getElementsByTagName('feDropShadow');
    if (domChild.length === 0) {
        domChild = this.createElement('feDropShadow');
    }

    domChild.setAttribute('dx', style.shadowOffsetX);
    domChild.setAttribute('dy', style.shadowOffsetY);
    domChild.setAttribute('stdDeviation', style.shadowBlur);
    domChild.setAttribute('flood-color', style.shadowColor);

    // Fix filter clipping problem
    dom.setAttribute('x', -Math.abs(style.shadowOffsetX));
    dom.setAttribute('y', -Math.abs(style.shadowOffsetY));
    dom.setAttribute('width', Math.abs(style.shadowOffsetX) * 2);
    dom.setAttribute('height', Math.abs(style.shadowOffsetY) * 2);

    dom.appendChild(domChild);

    // Store dom element in shadow, to avoid creating multiple
    // dom instances for the same shadow element
    style._shadowDom = dom;
};

/**
 * Mark a single shadow to be used
 *
 * @param {Displayable} displayable displayable element
 */
ShadowManager.prototype.markUsed = function (displayable) {
    var style = displayable.style;
    if (style && style._shadowDom) {
        Definable.prototype.markUsed.call(this, style._shadowDom);
    }
};


export default ShadowManager;
