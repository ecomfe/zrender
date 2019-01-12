/**
 * @file Manages SVG gradient elements.
 * @author Zhang Wenli
 */

import Definable from './Definable';
import * as zrUtil from '../../core/util';
import zrLog from '../../core/log';
import * as colorTool from '../../tool/color';

/**
 * Manages SVG gradient elements.
 *
 * @class
 * @extends Definable
 * @param   {number}     zrId    zrender instance id
 * @param   {SVGElement} svgRoot root of SVG document
 */
function GradientManager(zrId, svgRoot) {
    Definable.call(
        this,
        zrId,
        svgRoot,
        ['linearGradient', 'radialGradient'],
        '__gradient_in_use__'
    );
}


zrUtil.inherits(GradientManager, Definable);


/**
 * Create new gradient DOM for fill or stroke if not exist,
 * but will not update gradient if exists.
 *
 * @param {SvgElement}  svgElement   SVG element to paint
 * @param {Displayable} displayable  zrender displayable element
 */
GradientManager.prototype.addWithoutUpdate = function (
    svgElement,
    displayable
) {
    if (displayable && displayable.style) {
        var that = this;
        zrUtil.each(['fill', 'stroke'], function (fillOrStroke) {
            if (displayable.style[fillOrStroke]
                && (displayable.style[fillOrStroke].type === 'linear'
                || displayable.style[fillOrStroke].type === 'radial')
            ) {
                var gradient = displayable.style[fillOrStroke];
                var defs = that.getDefs(true);

                // Create dom in <defs> if not exists
                var dom;
                if (gradient._dom) {
                    // Gradient exists
                    dom = gradient._dom;
                    if (!defs.contains(gradient._dom)) {
                        // _dom is no longer in defs, recreate
                        that.addDom(dom);
                    }
                }
                else {
                    // New dom
                    dom = that.add(gradient);
                }

                that.markUsed(displayable);

                var id = dom.getAttribute('id');
                svgElement.setAttribute(fillOrStroke, 'url(#' + id + ')');
            }
        });
    }
};


/**
 * Add a new gradient tag in <defs>
 *
 * @param   {Gradient} gradient zr gradient instance
 * @return {SVGLinearGradientElement | SVGRadialGradientElement}
 *                            created DOM
 */
GradientManager.prototype.add = function (gradient) {
    var dom;
    if (gradient.type === 'linear') {
        dom = this.createElement('linearGradient');
    }
    else if (gradient.type === 'radial') {
        dom = this.createElement('radialGradient');
    }
    else {
        zrLog('Illegal gradient type.');
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
};


/**
 * Update gradient.
 *
 * @param {Gradient} gradient zr gradient instance
 */
GradientManager.prototype.update = function (gradient) {
    var that = this;
    Definable.prototype.update.call(this, gradient, function () {
        var type = gradient.type;
        var tagName = gradient._dom.tagName;
        if (type === 'linear' && tagName === 'linearGradient'
            || type === 'radial' && tagName === 'radialGradient'
        ) {
            // Gradient type is not changed, update gradient
            that.updateDom(gradient, gradient._dom);
        }
        else {
            // Remove and re-create if type is changed
            that.removeDom(gradient);
            that.add(gradient);
        }
    });
};


/**
 * Update gradient dom
 *
 * @param {Gradient} gradient zr gradient instance
 * @param {SVGLinearGradientElement | SVGRadialGradientElement} dom
 *                            DOM to update
 */
GradientManager.prototype.updateDom = function (gradient, dom) {
    if (gradient.type === 'linear') {
        dom.setAttribute('x1', gradient.x);
        dom.setAttribute('y1', gradient.y);
        dom.setAttribute('x2', gradient.x2);
        dom.setAttribute('y2', gradient.y2);
    }
    else if (gradient.type === 'radial') {
        dom.setAttribute('cx', gradient.x);
        dom.setAttribute('cy', gradient.y);
        dom.setAttribute('r', gradient.r);
    }
    else {
        zrLog('Illegal gradient type.');
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
    var colors = gradient.colorStops;
    for (var i = 0, len = colors.length; i < len; ++i) {
        var stop = this.createElement('stop');
        stop.setAttribute('offset', colors[i].offset * 100 + '%');

        var color = colors[i].color;
        if (color.indexOf('rgba' > -1)) {
            // Fix Safari bug that stop-color not recognizing alpha #9014
            var opacity = colorTool.parse(color)[3];
            var hex = colorTool.toHex(color);

            // stop-color cannot be color, since:
            // The opacity value used for the gradient calculation is the
            // *product* of the value of stop-opacity and the opacity of the
            // value of stop-color.
            // See https://www.w3.org/TR/SVG2/pservers.html#StopOpacityProperty
            stop.setAttribute('stop-color', '#' + hex);
            stop.setAttribute('stop-opacity', opacity);
        }
        else {
            stop.setAttribute('stop-color', colors[i].color);
        }

        dom.appendChild(stop);
    }

    // Store dom element in gradient, to avoid creating multiple
    // dom instances for the same gradient element
    gradient._dom = dom;
};

/**
 * Mark a single gradient to be used
 *
 * @param {Displayable} displayable displayable element
 */
GradientManager.prototype.markUsed = function (displayable) {
    if (displayable.style) {
        var gradient = displayable.style.fill;
        if (gradient && gradient._dom) {
            Definable.prototype.markUsed.call(this, gradient._dom);
        }

        gradient = displayable.style.stroke;
        if (gradient && gradient._dom) {
            Definable.prototype.markUsed.call(this, gradient._dom);
        }
    }
};


export default GradientManager;
