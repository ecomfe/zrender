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

        refresh: function () {

            var list = this.storage.getDisplayList(true);

            this._paintList(list);
        },

        _paintList: function (list) {
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
                        displayable.__dirty = false;
                    }
                    newVisibleList.push(displayable);
                }
            }

            var diff = arrayDiff(visibleList, newVisibleList);
            var prevSvgElement;

            // First do remove, in case element moved to the head and do remove after add
            var removeList = [];
            for (i = 0; i < diff.length; i++) {
                var item = diff[i];
                if (item.cmd === '-') {
                    var displayable = visibleList[item.idx];
                    var svgElement = getSvgElement(displayable);
                    var textSvgElement = getTextSvgElement(displayable);
                    remove(svgRoot, svgElement);
                    remove(svgRoot, textSvgElement);
                    removeList.push(displayable);
                }
            }
            for (i = 0; i < diff.length; i++) {
                var item = diff[i];
                switch (item.cmd) {
                    case '=':
                        var displayable = visibleList[item.idx];
                        prevSvgElement = getTextSvgElement(displayable) || getSvgElement(displayable);
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

                        this._setGradient(svgElement, displayable, 'fill');
                        this._setGradient(svgElement, displayable, 'stroke');

                        break;
                    // case '^':
                        // var displayable = visibleList[item.idx];
                        // var svgElement = getSvgElement(displayable);
                        // prevSvgElement ? insertAfter(svgRoot, svgElement, prevSvgElement)
                        //     : prepend(svgRoot, svgElement);
                        // break;
                }
            }

            this._removeUnusedGradient(newVisibleList, removeList);

            this._visibleList = newVisibleList;
        },

        /**
         * Set gradient for fill or stroke
         *
         * @param {SvgElement}  svgElement   SVG element to paint
         * @param {Displayable} displayable  zrender displayable element
         * @param {string}      fillOrStroke should be 'fill' or 'stroke'
         */
        _setGradient: function (svgElement, displayable, fillOrStroke) {
            if (displayable
                && displayable.style
                && displayable.style[fillOrStroke]
                && (displayable.style[fillOrStroke].type === 'linear'
                || displayable.style[fillOrStroke].type === 'radial')
            ) {
                var gradient = displayable.style[fillOrStroke];

                // Create dom in <defs> if not exists
                var dom = gradient.__dom || this._addGradient(gradient);
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
                el.setAttribute('x1', gradient.x);
                el.setAttribute('y1', gradient.y);
                el.setAttribute('x2', gradient.x2);
                el.setAttribute('y2', gradient.y2);
            }
            else if (gradient.type === 'radial') {
                el = createElement('radialGradient');
                el.setAttribute('cx', gradient.x);
                el.setAttribute('cy', gradient.y);
                el.setAttribute('r', gradient.r);
            }
            else {
                zrLog('Illegal gradient type.');
                return null;
            }

            // Set dom id with gradient id, since each gradient instance
            // will have no more than one dom element
            if (!gradient.id) {
                gradient.id = Math.random();
            }
            el.setAttribute('id', 'zr-gradient-' + gradient.id);

            // Add color stops
            var colors = gradient.colorStops;
            for (var i = 0, len = colors.length; i < len; ++i) {
                var stop = createElement('stop');
                stop.setAttribute('offset', colors[i].offset * 100 + '%');
                stop.setAttribute('stop-color', colors[i].color);
                el.appendChild(stop);
            }

            var defs = this._getDefs();
            defs.appendChild(el);

            // Store dom element in gradient, to avoid creating multiple
            // dom instances for the same gradient element
            gradient.__dom = el;

            return el;
        },

        _removeUnusedGradient: function (newVisibleList, removeList) {
            if (removeList.length === 0) {
                // Not removing any, do nothing
                return;
            }

            var defs = this._getDefs();

            // Get all gradients doms
            var doms = this._getGradients();

            util.each(doms, function (dom) {
                var isUsed = false;

                util.each(newVisibleList, function (element) {
                    var inUse = function (attr) {
                        return element.style
                            && element.style[attr]
                            && element.style[attr].__dom === dom;
                    };
                    isUsed = isUsed || inUse('fill') || inUse('stroke');
                });

                if (!isUsed) {
                    // Remove gradient that is not used by any elements
                    defs.removeChild(dom);

                    // Romove reference to dom element in displayables
                    // so that if this element is to be added afterwards,
                    // it will create new gradient dom
                    util.each(removeList, function (element) {
                        if (element && element.style) {
                            var checkAttr = function (attr) {
                                if (element.style[attr]
                                    && element.style[attr].__dom === dom
                                ) {
                                    element.style[attr].__dom = null;
                                }
                            };
                            checkAttr('fill');
                            checkAttr('stroke');
                        }
                    });
                }
            });

        },

        /**
         * Get the <defs> tag for svgRoot. Create one if not exists.
         *
         * @returns {SVGDefsElement} SVG <defs> element
         */
        _getDefs: function () {
            var svgRoot = this._svgRoot;
            var defs = this._svgRoot.getElementsByTagName('defs');
            return defs.length === 0
                ? svgRoot.insertBefore(
                    createElement('defs'), // Create new tag
                    svgRoot.firstChild // Insert in the front of svg
                )
                : defs[0]; // Use previously defined <defs>
        },

        _getGradients: function () {
            var defs = this._getDefs();

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