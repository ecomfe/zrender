/**
 * SVG Painter
 * @module zrender/svg/Painter
 */

define(function (require) {
    var svgCore = require('./core');
    var zrLog = require('../core/log');
    var Path = require('../graphic/Path');
    var ZImage = require('../graphic/Image');
    var ZText = require('../graphic/Text');
    var arrayDiff = require('../core/arrayDiff');
    var util = require('../core/util');

    var svgGraphic = require('./graphic');
    var svgPath = svgGraphic.path;
    var svgImage = svgGraphic.image;
    var svgText = svgGraphic.text;

    var createElement = svgCore.createElement;

    var GRADIENT_MARK = '_gradientInUse';
    var GRADIENT_MARK_UNUSED = '0';
    var GRADIENT_MARK_USED = '1';

    var nextGradientId = 1;

    function parseInt10(val) {
        return parseInt(val, 10);
    }

    function getSvgProxy(el) {
        if (el instanceof Path) {
            return svgPath;
        }
        else if (el instanceof ZImage) {
            return svgImage;
        }
        else if (el instanceof ZText) {
            return svgText;
        }
    }

    function checkParentAvailable(parent, child) {
        return child && parent && child.parentNode !== parent;
    }

    function insertAfter(parent, child, prevSibling) {
        if (checkParentAvailable(parent, child) && prevSibling) {
            var nextSibling = prevSibling.nextSibling;
            nextSibling ? parent.insertBefore(child, nextSibling)
                : parent.appendChild(child);
        }
    }

    function prepend(parent, child) {
        if (checkParentAvailable(parent, child)) {
            var firstChild = parent.firstChild;
            firstChild ? parent.insertBefore(child, firstChild)
                : parent.appendChild(child);
        }
    }

    function append(parent, child) {
        if (checkParentAvailable(parent, child)) {
            parent.appendChild(child);
        }
    }

    function remove(parent, child) {
        if (child && parent && child.parentNode === parent) {
            parent.removeChild(child);
        }
    }

    function getTextSvgElement(displayable) {
        return displayable.__textSvgEl;
    }

    function getSvgElement(displayable) {
        return displayable.__svgEl;
    }

    /**
     * @alias module:zrender/svg/Painter
     */
    var SVGPainter = function (root, storage) {

        this.root = root;

        this.storage = storage;

        var svgRoot = createElement('svg');

        var viewport = document.createElement('div');
        viewport.style.cssText = 'overflow: hidden;';

        this._svgRoot = svgRoot;
        this._viewport = viewport;

        root.appendChild(viewport);
        viewport.appendChild(svgRoot);

        this.resize();

        this._visibleList = [];
    };

    SVGPainter.prototype = {

        constructor: SVGPainter,

        getViewportRoot: function () {
            return this._viewport;
        },

        getViewportRootOffset: function () {
            var viewportRoot = this.getViewportRoot();
            if (viewportRoot) {
                return {
                    offsetLeft: viewportRoot.offsetLeft || 0,
                    offsetTop: viewportRoot.offsetTop || 0
                };
            }
        },

        refresh: function () {

            var list = this.storage.getDisplayList(true);

            this._paintList(list);
        },

        _paintList: function (list) {
            this._markGradientsUnused();

            var svgRoot = this._svgRoot;
            var visibleList = this._visibleList;
            var listLen = list.length;

            var newVisibleList = [];
            var i;
            for (i = 0; i < listLen; i++) {
                var displayable = list[i];
                var svgProxy = getSvgProxy(displayable);
                if (!displayable.invisible) {
                    if (displayable.__dirty) {
                        svgProxy && svgProxy.brush(displayable);

                        // Update gradient
                        if (displayable.style) {
                            this._updateGradient(displayable.style.fill);
                            this._updateGradient(displayable.style.stroke);
                        }

                        displayable.__dirty = false;
                    }
                    newVisibleList.push(displayable);
                }
            }

            var diff = arrayDiff(visibleList, newVisibleList);
            var prevSvgElement;

            // First do remove, in case element moved to the head and do remove after add
            for (i = 0; i < diff.length; i++) {
                var item = diff[i];
                if (item.cmd === '-') {
                    var displayable = visibleList[item.idx];
                    var svgElement = getSvgElement(displayable);
                    var textSvgElement = getTextSvgElement(displayable);
                    remove(svgRoot, svgElement);
                    remove(svgRoot, textSvgElement);
                }
            }
            for (i = 0; i < diff.length; i++) {
                var item = diff[i];
                switch (item.cmd) {
                    case '=':
                        var displayable = visibleList[item.idx];
                        prevSvgElement
                            = svgElement
                            = getTextSvgElement(displayable)
                                || getSvgElement(displayable);
                        this._markGradientUsed(displayable);
                        break;
                    case '+':
                        var displayable = newVisibleList[item.idx];
                        var svgElement = getSvgElement(displayable);
                        var textSvgElement = getTextSvgElement(displayable);
                        prevSvgElement ? insertAfter(svgRoot, svgElement, prevSvgElement)
                            : prepend(svgRoot, svgElement);
                        if (svgElement) {
                            insertAfter(svgRoot, textSvgElement, svgElement);
                        }
                        else if (prevSvgElement) {
                            insertAfter(svgRoot, textSvgElement, prevSvgElement);
                        }
                        else {
                            prepend(svgRoot, textSvgElement);
                        }
                        // Insert text
                        insertAfter(svgRoot, textSvgElement, svgElement);
                        prevSvgElement = textSvgElement || svgElement;

                        break;
                    // case '^':
                        // var displayable = visibleList[item.idx];
                        // var svgElement = getSvgElement(displayable);
                        // prevSvgElement ? insertAfter(svgRoot, svgElement, prevSvgElement)
                        //     : prepend(svgRoot, svgElement);
                        // break;
                }

                this._createGradient(svgElement, displayable, 'fill');
                this._createGradient(svgElement, displayable, 'stroke');
            }

            this._removeUnusedGradient();

            this._visibleList = newVisibleList;
        },

        /**
         * Create new gradient for fill or stroke
         *
         * @param {SvgElement}  svgElement   SVG element to paint
         * @param {Displayable} displayable  zrender displayable element
         * @param {string}      fillOrStroke should be 'fill' or 'stroke'
         */
        _createGradient: function (svgElement, displayable, fillOrStroke) {
            if (displayable
                && displayable.style
                && displayable.style[fillOrStroke]
                && (displayable.style[fillOrStroke].type === 'linear'
                || displayable.style[fillOrStroke].type === 'radial')
            ) {
                var gradient = displayable.style[fillOrStroke];
                var defs = this._getDefs(true);

                // Create dom in <defs> if not exists
                var dom;
                if (gradient.__dom) {
                    // Gradient exists
                    dom = gradient.__dom;
                    if (!defs.contains(gradient.__dom)) {
                        // __dom is no longer in defs, recreate
                        this._addGradientDom(dom);
                    }
                }
                else {
                    dom = this._addGradient(gradient);
                }

                // Mark gradient to be used
                dom[GRADIENT_MARK] = GRADIENT_MARK_USED;

                var id = dom.getAttribute('id');
                svgElement.setAttribute(fillOrStroke, 'url(#' + id + ')');
            }
        },

        /**
         * Add a new gradient tag in <defs>
         *
         * @param {Gradient} gradient zr gradient instance
         * @returns {SVGElement} Either <linearGradient>
         *                       or <radialGradient> element
         */
        _addGradient: function (gradient) {
            var el;
            if (gradient.type === 'linear') {
                el = createElement('linearGradient');
            }
            else if (gradient.type === 'radial') {
                el = createElement('radialGradient');
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
            gradient.id = gradient.id || nextGradientId++;
            el.setAttribute('id', 'zr-gradient-' + gradient.id);

            this._updateGradientDom(gradient, el);
            this._addGradientDom(el);

            return el;
        },

        /**
         * Add gradient dom to defs
         *
         * @param {SVGElement} dom      Either <linearGradient>
         *                              or <radialGradient> element
         */
        _addGradientDom: function (dom) {
            var defs = this._getDefs(true);
            defs.appendChild(dom);
        },

        /**
         * Update gradient
         *
         * @param {Gradient} gradient zr gradient instance
         */
        _updateGradient: function (gradient) {
            // Not a gradient
            if (!gradient
                || gradient.type !== 'linear' && gradient.type !== 'radial'
            ) {
                return;
            }

            // Update previous gradient dom if exists
            var defs = this._getDefs(false);
            if (gradient.__dom && defs && defs.contains(gradient.__dom)) {
                // Update dom
                var type = gradient.type;
                var tagName = gradient.__dom.tagName;
                if (type === 'linear' && tagName === 'linearGradient'
                    || type === 'radial' && tagName === 'radialGradient'
                ) {
                    // Gradient type is not changed, update gradient
                    this._updateGradientDom(gradient, gradient.__dom);
                }
                else {
                    // Remove and re-create if type is changed
                    defs.removeChild(gradient.__dom);
                    this._addGradient(gradient);
                }
            }
            else {
                // No previous dom, create new
                var dom = this._addGradient(gradient);
                gradient.__dom = dom;
            }
        },

        /**
         * Update gradient dom
         *
         * @param {Gradient} gradient zr gradient instance
         * @param {SVGElement} dom Either <linearGradient>
         *                         or <radialGradient> element
         */
        _updateGradientDom: function (gradient, dom) {
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
                var stop = createElement('stop');
                stop.setAttribute('offset', colors[i].offset * 100 + '%');
                stop.setAttribute('stop-color', colors[i].color);
                dom.appendChild(stop);
            }

            // Store dom element in gradient, to avoid creating multiple
            // dom instances for the same gradient element
            gradient.__dom = dom;
        },

        /**
         * Mark gradients to be unused before painting, and clear unused
         * ones at the end of the painting
         */
        _markGradientsUnused: function () {
            var doms = this._getGradients();
            util.each(doms, function (dom) {
                dom[GRADIENT_MARK] = GRADIENT_MARK_UNUSED;
            });
        },

        /**
         * Remove unused gradients defined in <defs>
         */
        _removeUnusedGradient: function () {
            var defs = this._getDefs(false);
            if (!defs) {
                // Nothing to remove
                return;
            }

            var doms = this._getGradients();
            util.each(doms, function (dom) {
                if (dom[GRADIENT_MARK] !== GRADIENT_MARK_USED) {
                    // Remove gradient
                    defs.removeChild(dom);
                }
            });
        },

        /**
         * Mark a single gradient to be used
         *
         * @param {Displayable} displayable displayable element
         */
        _markGradientUsed: function (displayable) {
            if (displayable.style) {
                var gradient = displayable.style.fill;
                if (gradient && gradient.__dom) {
                    gradient.__dom[GRADIENT_MARK] = GRADIENT_MARK_USED;
                }

                gradient = displayable.style.stroke;
                if (gradient && gradient.__dom) {
                    gradient.__dom[GRADIENT_MARK] = GRADIENT_MARK_USED;
                }
            }
        },

        /**
         * Get the <defs> tag for svgRoot; optionally creates one if not exists.
         *
         * @param {boolean} isForceCreating if need to create when not exists
         * @returns {SVGDefsElement} SVG <defs> element, null if it doesn't
         * exist and isForceCreating is false
         */
        _getDefs: function (isForceCreating) {
            var svgRoot = this._svgRoot;
            var defs = this._svgRoot.getElementsByTagName('defs');
            if (defs.length === 0) {
                // Not exist
                if (isForceCreating) {
                    return svgRoot.insertBefore(
                        createElement('defs'), // Create new tag
                        svgRoot.firstChild // Insert in the front of svg
                    );
                }
                else {
                    return null;
                }
            }
            else {
                return defs[0];
            }
        },

        _getGradients: function () {
            var defs = this._getDefs(false);
            if (!defs) {
                // No gradients when defs is not defined
                return [];
            }

            var gradType = ['linear', 'radial'];
            var doms = [];

            util.each(gradType, function (type) {
                var tags = defs.getElementsByTagName(type + 'Gradient');
                // Note that tags is HTMLCollection, which is array-like
                // rather than real array.
                // So`doms.concat(tags)` add tags as one object.
                doms = doms.concat([].slice.call(tags));
            });

            return doms;
        },

        resize: function () {
            var width = this._getWidth();
            var height = this._getHeight();

            if (this._width !== width && this._height !== height) {
                this._width = width;
                this._height = height;

                var viewportStyle = this._viewport.style;
                viewportStyle.width = width + 'px';
                viewportStyle.height = height + 'px';

                var svgRoot = this._svgRoot;
                // Set width by 'svgRoot.width = width' is invalid
                svgRoot.setAttribute('width', width);
                svgRoot.setAttribute('height', height);
            }
        },

        getWidth: function () {
            return this._getWidth();
        },

        getHeight: function () {
            return this._getHeight();
        },

        _getWidth: function () {
            var root = this.root;
            var stl = document.defaultView.getComputedStyle(root);

            return ((root.clientWidth || parseInt10(stl.width))
                    - parseInt10(stl.paddingLeft)
                    - parseInt10(stl.paddingRight)) | 0;
        },

        _getHeight: function () {
            var root = this.root;
            var stl = document.defaultView.getComputedStyle(root);

            return ((root.clientHeight || parseInt10(stl.height))
                    - parseInt10(stl.paddingTop)
                    - parseInt10(stl.paddingBottom)) | 0;
        },

        dispose: function () {
            this.root.innerHTML = '';

            this._svgRoot =
            this._viewport =
            this.storage = null;
        },

        clear: function () {
            if (this._viewport) {
                this.root.removeChild(this._viewport);
            }
        }
    }

    // Not supported methods
    function createMethodNotSupport(method) {
        return function () {
            zrLog('In SVG mode painter not support method "' + method + '"')
        }
    }

    var notSupportedMethods = [
        'getLayer', 'insertLayer', 'eachLayer', 'eachBuiltinLayer', 'eachOtherLayer', 'getLayers',
        'modLayer', 'delLayer', 'clearLayer', 'toDataURL', 'pathToImage'
    ];

    for (var i = 0; i < notSupportedMethods.length; i++) {
        var name = notSupportedMethods[i];
        SVGPainter.prototype[name] = createMethodNotSupport(name);
    }

    return SVGPainter;
});
