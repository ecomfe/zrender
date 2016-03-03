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
                        break;
                    // case '^':
                        // var displayable = visibleList[item.idx];
                        // var svgElement = getSvgElement(displayable);
                        // prevSvgElement ? insertAfter(svgRoot, svgElement, prevSvgElement)
                        //     : prepend(svgRoot, svgElement);
                        // break;
                }
            }

            this._visibleList = newVisibleList;
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
        'getLayer', 'insertLayer', 'eachLayer', 'eachBuildinLayer', 'eachOtherLayer', 'getLayers',
        'modLayer', 'delLayer', 'clearLayer', 'toDataURL', 'pathToImage'
    ];

    for (var i = 0; i < notSupportedMethods.length; i++) {
        var name = notSupportedMethods[i];
        SVGPainter.prototype[name] = createMethodNotSupport(name);
    }

    return SVGPainter;
});