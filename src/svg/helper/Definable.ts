/**
 * @file Manages elements that can be defined in <defs> in SVG,
 *       e.g., gradients, clip path, etc.
 * @author Zhang Wenli
 */

import {createElement} from '../core';
import * as zrUtil from '../../core/util';
import Path from '../../graphic/Path';
import ZImage from '../../graphic/Image';
import ZText from '../../graphic/Text';
import {
    path as svgPath,
    image as svgImage,
    text as svgText
} from '../graphic';


var MARK_UNUSED = '0';
var MARK_USED = '1';

/**
 * Manages elements that can be defined in <defs> in SVG,
 * e.g., gradients, clip path, etc.
 *
 * @class
 * @param {number}          zrId      zrender instance id
 * @param {SVGElement}      svgRoot   root of SVG document
 * @param {string|string[]} tagNames  possible tag names
 * @param {string}          markLabel label name to make if the element
 *                                    is used
 */
function Definable(
    zrId,
    svgRoot,
    tagNames,
    markLabel,
    domName
) {
    this._zrId = zrId;
    this._svgRoot = svgRoot;
    this._tagNames = typeof tagNames === 'string' ? [tagNames] : tagNames;
    this._markLabel = markLabel;
    this._domName = domName || '_dom';

    this.nextId = 0;
}


Definable.prototype.createElement = createElement;


/**
 * Get the <defs> tag for svgRoot; optionally creates one if not exists.
 *
 * @param {boolean} isForceCreating if need to create when not exists
 * @return {SVGDefsElement} SVG <defs> element, null if it doesn't
 * exist and isForceCreating is false
 */
Definable.prototype.getDefs = function (isForceCreating) {
    var svgRoot = this._svgRoot;
    var defs = this._svgRoot.getElementsByTagName('defs');
    if (defs.length === 0) {
        // Not exist
        if (isForceCreating) {
            defs = svgRoot.insertBefore(
                this.createElement('defs'), // Create new tag
                svgRoot.firstChild // Insert in the front of svg
            );
            if (!defs.contains) {
                // IE doesn't support contains method
                defs.contains = function (el) {
                    var children = defs.children;
                    if (!children) {
                        return false;
                    }
                    for (var i = children.length - 1; i >= 0; --i) {
                        if (children[i] === el) {
                            return true;
                        }
                    }
                    return false;
                };
            }
            return defs;
        }
        else {
            return null;
        }
    }
    else {
        return defs[0];
    }
};


/**
 * Update DOM element if necessary.
 *
 * @param {Object|string} element style element. e.g., for gradient,
 *                                it may be '#ccc' or {type: 'linear', ...}
 * @param {Function|undefined} onUpdate update callback
 */
Definable.prototype.update = function (element, onUpdate) {
    if (!element) {
        return;
    }

    var defs = this.getDefs(false);
    if (element[this._domName] && defs.contains(element[this._domName])) {
        // Update DOM
        if (typeof onUpdate === 'function') {
            onUpdate(element);
        }
    }
    else {
        // No previous dom, create new
        var dom = this.add(element);
        if (dom) {
            element[this._domName] = dom;
        }
    }
};


/**
 * Add gradient dom to defs
 *
 * @param {SVGElement} dom DOM to be added to <defs>
 */
Definable.prototype.addDom = function (dom) {
    var defs = this.getDefs(true);
    defs.appendChild(dom);
};


/**
 * Remove DOM of a given element.
 *
 * @param {SVGElement} element element to remove dom
 */
Definable.prototype.removeDom = function (element) {
    var defs = this.getDefs(false);
    if (defs && element[this._domName]) {
        defs.removeChild(element[this._domName]);
        element[this._domName] = null;
    }
};


/**
 * Get DOMs of this element.
 *
 * @return {HTMLDomElement} doms of this defineable elements in <defs>
 */
Definable.prototype.getDoms = function () {
    var defs = this.getDefs(false);
    if (!defs) {
        // No dom when defs is not defined
        return [];
    }

    var doms = [];
    zrUtil.each(this._tagNames, function (tagName) {
        var tags = defs.getElementsByTagName(tagName);
        // Note that tags is HTMLCollection, which is array-like
        // rather than real array.
        // So `doms.concat(tags)` add tags as one object.
        doms = doms.concat([].slice.call(tags));
    });

    return doms;
};


/**
 * Mark DOMs to be unused before painting, and clear unused ones at the end
 * of the painting.
 */
Definable.prototype.markAllUnused = function () {
    var doms = this.getDoms();
    var that = this;
    zrUtil.each(doms, function (dom) {
        dom[that._markLabel] = MARK_UNUSED;
    });
};


/**
 * Mark a single DOM to be used.
 *
 * @param {SVGElement} dom DOM to mark
 */
Definable.prototype.markUsed = function (dom) {
    if (dom) {
        dom[this._markLabel] = MARK_USED;
    }
};


/**
 * Remove unused DOMs defined in <defs>
 */
Definable.prototype.removeUnused = function () {
    var defs = this.getDefs(false);
    if (!defs) {
        // Nothing to remove
        return;
    }

    var doms = this.getDoms();
    var that = this;
    zrUtil.each(doms, function (dom) {
        if (dom[that._markLabel] !== MARK_USED) {
            // Remove gradient
            defs.removeChild(dom);
        }
    });
};


/**
 * Get SVG proxy.
 *
 * @param {Displayable} displayable displayable element
 * @return {Path|Image|Text} svg proxy of given element
 */
Definable.prototype.getSvgProxy = function (displayable) {
    if (displayable instanceof Path) {
        return svgPath;
    }
    else if (displayable instanceof ZImage) {
        return svgImage;
    }
    else if (displayable instanceof ZText) {
        return svgText;
    }
    else {
        return svgPath;
    }
};


/**
 * Get text SVG element.
 *
 * @param {Displayable} displayable displayable element
 * @return {SVGElement} SVG element of text
 */
Definable.prototype.getTextSvgElement = function (displayable) {
    return displayable.__textSvgEl;
};


/**
 * Get SVG element.
 *
 * @param {Displayable} displayable displayable element
 * @return {SVGElement} SVG element
 */
Definable.prototype.getSvgElement = function (displayable) {
    return displayable.__svgEl;
};


export default Definable;
