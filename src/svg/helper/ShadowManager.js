/**
 * @file Manages SVG shadow elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import * as zrUtil from '../../core/util';

/**
 * Manages SVG shadow elements.
 *
 * @class
 * @extends Definable
 * @param   {number}     zrId    zrender instance id
 * @param   {SVGElement} svgRoot root of SVG document
 */
function ShadowManager(zrId, svgRoot) {
    Definable.call(
        this,
        zrId,
        svgRoot,
        ['filter'],
        '__filter_in_use__',
        '_shadowDom'
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
    if (displayable && hasShadow(displayable.style)) {
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
            dom = this.add(displayable);
        }

        this.markUsed(displayable);

        var id = dom.getAttribute('id');
        svgElement.style.filter = 'url(#' + id + ')';
    }
};


/**
 * Add a new shadow tag in <defs>
 *
 * @param {Displayable} displayable  zrender displayable element
 * @return {SVGFilterElement} created DOM
 */
ShadowManager.prototype.add = function (displayable) {
    var dom = this.createElement('filter');
    var style = displayable.style;

    // Set dom id with shadow id, since each shadow instance
    // will have no more than one dom element.
    // id may exists before for those dirty elements, in which case
    // id should remain the same, and other attributes should be
    // updated.
    style._shadowDomId = style._shadowDomId || this.nextId++;
    dom.setAttribute('id', 'zr' + this._zrId
        + '-shadow-' + style._shadowDomId);

    this.updateDom(displayable, dom);
    this.addDom(dom);

    return dom;
};


/**
 * Update shadow.
 *
 * @param {Displayable} displayable  zrender displayable element
 */
ShadowManager.prototype.update = function (svgElement, displayable) {
    var style = displayable.style;
    if (hasShadow(style)) {
        var that = this;
        Definable.prototype.update.call(this, displayable, function (style) {
            that.updateDom(displayable, style._shadowDom);
        });
    }
    else {
        // Remove shadow
        this.remove(svgElement, style);
    }
};


/**
 * Remove DOM and clear parent filter
 */
ShadowManager.prototype.remove = function (svgElement, style) {
    if (style._shadowDomId != null) {
        this.removeDom(style);
        svgElement.style.filter = '';
    }
};


/**
 * Update shadow dom
 *
 * @param {Displayable} displayable  zrender displayable element
 * @param {SVGFilterElement} dom DOM to update
 */
ShadowManager.prototype.updateDom = function (displayable, dom) {
    var domChild = dom.getElementsByTagName('feDropShadow');
    if (domChild.length === 0) {
        domChild = this.createElement('feDropShadow');
    }
    else {
        domChild = domChild[0];
    }

    var style = displayable.style;
    var scaleX = displayable.scale ? (displayable.scale[0] || 1) : 1;
    var scaleY = displayable.scale ? (displayable.scale[1] || 1) : 1;

    // TODO: textBoxShadowBlur is not supported yet
    var offsetX;
    var offsetY;
    var blur;
    var color;
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
        this.removeDom(dom, style);
        return;
    }

    domChild.setAttribute('dx', offsetX / scaleX);
    domChild.setAttribute('dy', offsetY / scaleY);
    domChild.setAttribute('flood-color', color);

    // Divide by two here so that it looks the same as in canvas
    // See: https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-shadowblur
    var stdDx = blur / 2 / scaleX;
    var stdDy = blur / 2 / scaleY;
    var stdDeviation = stdDx + ' ' + stdDy;
    domChild.setAttribute('stdDeviation', stdDeviation);

    // Fix filter clipping problem
    dom.setAttribute('x', '-100%');
    dom.setAttribute('y', '-100%');
    dom.setAttribute('width', Math.ceil(blur / 2 * 200) + '%');
    dom.setAttribute('height', Math.ceil(blur / 2 * 200) + '%');

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

function hasShadow(style) {
    // TODO: textBoxShadowBlur is not supported yet
    return style
        && (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY
            || style.textShadowBlur || style.textShadowOffsetX
            || style.textShadowOffsetY);
}


export default ShadowManager;
