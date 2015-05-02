/**
 * SVG Painter
 * @module zrender/svg/Painter
 */

define(function (require) {
    var svgCore = require('./core');
    var zrLog = require('../core/log');
    var Path = require('../graphic/Path');
    var svgGraphic = require('./graphic');
    var svgPath = svgGraphic.path;
    
    var createElement = svgCore.createElement;

    function parseInt10(val) {
        return parseInt(val, 10);
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
        
        // Modify storage
        var oldDelFromMap = storage.delFromMap;
        var oldAddToMap = storage.addToMap;
        storage.delFromMap = function (elId) {
            var el = storage.get(elId);

            oldDelFromMap.call(storage, elId);

            if (el instanceof Path) {
                svgPath.onRemoveFromStorage(el, svgRoot);
            }
        }

        storage.addToMap = function (el) {
            // Displayable already has a vml node
            if (el instanceof Path) {
                svgPath.onAddToStorage(el, svgRoot);
            }
            oldAddToMap.call(storage, el);
        }
    };

    SVGPainter.prototype = {

        constructor: SVGPainter,

        refresh: function () {

            var list = this.storage.getDisplayList(true);

            this._paintList(list);
        },

        _paintList: function (list) {
            for (var i = 0; i < list.length; i++) {
                var displayable = list[i];
                if (displayable.__dirty && !displayable.invisible) {
                    if (displayable instanceof Path) {
                        svgPath.brush(displayable, this._svgRoot);
                        displayable.__dirty = false;
                    }
                }
            }
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