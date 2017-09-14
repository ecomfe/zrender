/**
 * @file Manages SVG clipPath elements.
 * @author Zhang Wenli
 */

define(function (require) {

    var Definable = require('./Definable');
    var zrUtil = require('../../core/util');
    var matrix = require('../../core/matrix');

    /**
     * Manages SVG clipPath elements.
     *
     * @class
     * @extends Definable
     * @param   {SVGElement} svgRoot root of SVG document
     */
    function ClippathManager(svgRoot) {
        Definable.call(this, svgRoot, 'clipPath', '__clippath_in_use__');
    }


    zrUtil.inherits(ClippathManager, Definable);


    /**
     * Update clipPath.
     *
     * @param {Displayable} displayable displayable element
     * @param {SVGElement}  svgElement  SVG element of displayable
     */
    ClippathManager.prototype.update = function (displayable, svgElement) {
        this.updateDom(svgElement, displayable.__clipPaths, false);

        var textEl = this.getTextSvgElement(displayable);
        if (textEl) {
            // Make another clipPath for text, since it's transform
            // matrix is not the same with svgElement
            this.updateDom(textEl, displayable.__clipPaths, true);
        }

        this.markUsed(displayable);
    };


    /**
     * Create an SVGElement of displayable and create a <clipPath> of its
     * clipPath
     *
     * @param {Displayable} parentEl  parent element
     * @param {ClipPath[]}  clipPaths clipPaths of parent element
     * @param {boolean}     isText    if parent element is Text
     */
    ClippathManager.prototype.updateDom = function (
        parentEl,
        clipPaths,
        isText
    ) {
        if (clipPaths && clipPaths.length > 0) {
            // Has clipPath, create <clipPath> with the first clipPath
            var defs = this.getDefs(true);
            var clipPath = clipPaths[0];
            var clipPathEl;
            var id;

            var dom = isText ? '_textDom' : '_dom';

            if (clipPath[dom]) {
                // Use a dom that is already in <defs>
                id = clipPath[dom].getAttribute('id');
                clipPathEl = clipPath[dom];

                // Use a dom that is already in <defs>
                if (!defs.contains(clipPathEl)) {
                    // This happens when set old clipPath that has
                    // been previously removed
                    defs.appendChild(clipPathEl);
                }
            }
            else {
                // New <clipPath>
                id = 'zr-clip-' + this.nextId;
                ++this.nextId;
                clipPathEl = this.createElement('clipPath');
                clipPathEl.setAttribute('id', id);
                defs.appendChild(clipPathEl);

                clipPath[dom] = clipPathEl;
            }

            // Build path and add to <clipPath>
            var svgProxy = this.getSvgProxy(clipPath);
            if (clipPath.transform
                && clipPath.parent.invTransform
                && !isText
            ) {
                /**
                 * If a clipPath has a parent with transform, the transform
                 * of parent should not be considered when setting transform
                 * of clipPath. So we need to transform back from parent's
                 * transform, which is done by multiplying parent's inverse
                 * transform.
                 */
                // Store old transform
                var transform = Array.prototype.slice.call(
                    clipPath.transform
                );

                // Transform back from parent, and brush path
                matrix.mul(
                    clipPath.transform,
                    clipPath.parent.invTransform,
                    clipPath.transform
                );
                svgProxy.brush(clipPath);

                // Set back transform of clipPath
                clipPath.transform = transform;
            }
            else {
                svgProxy.brush(clipPath);
            }

            var pathEl = this.getSvgElement(clipPath);
            clipPathEl.appendChild(pathEl);

            parentEl.setAttribute('clip-path', 'url(#' + id + ')');

            if (clipPaths.length > 1) {
                // Make the other clipPaths recursively
                this.updateDom(clipPathEl, clipPaths.slice(1), isText);
            }
        }
        else {
            // No clipPath
            if (parentEl) {
                parentEl.setAttribute('clip-path', 'none');
            }
        }
    };

    /**
     * Mark a single clipPath to be used
     *
     * @param {Displayable} displayable displayable element
     */
    ClippathManager.prototype.markUsed = function (displayable) {
        var that = this;
        if (displayable.__clipPaths && displayable.__clipPaths.length > 0) {
            zrUtil.each(displayable.__clipPaths, function (clipPath) {
                if (clipPath._dom) {
                    Definable.prototype.markUsed.call(that, clipPath._dom);
                }
                if (clipPath._textDom) {
                    Definable.prototype.markUsed.call(that, clipPath._textDom);
                }
            });
        }
    };


    return ClippathManager;

});
