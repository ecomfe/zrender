define(function (require) {
			
	var svgCore = require('./core');
	var CMD = require('../core/PathProxy').CMD;
	
	var createElement = svgCore.createElement;
	var arrayJoin = Array.prototype.join;

	var NONE = 'none';

    function pathHasFill(style) {
        var fill = style.fill;
        return fill != null && fill !== NONE;
    }

    function pathHasStroke(style) {
        var stroke = style.stroke;
        return stroke != null && stroke !== NONE;
    }

	function setTransform(svgEl, m) {
		if (m) {
			svgEl.transform = 'matrix(' + arrayJoin.call(m, ',') + ')';
		}
	}

    function append(parent, child) {
        if (child && parent && child.parentNode !== parent) {
            parent.appendChild(child);
        }
    }

    function remove(parent, child) {
        if (child && parent && child.parentNode === parent) {
            parent.removeChild(child);
        }
    }

    function attr(el, key, val) {
    	el.setAttribute(key, val);
    }

    function bindStyle(svgEl, style) {
    	if (pathHasFill(style)) {
    		attr(svgEl, 'fill', style.fill);
    		attr(svgEl, 'fill-opacity', style.opacity);
    	}
    	else {
    		attr(svgEl, 'fill', NONE);
    	}
    	if (pathHasStroke(style)) {
    		attr(svgEl, 'stroke', style.stroke);
    		attr(svgEl, 'stroke-width', style.strokeWidth);
    		attr(svgEl, 'stroke-opacity', style.opacity);
    		var lineDash = svgEl.lineDash;
    		if (lineDash) {
    			attr(svgEl, 'stroke-dasharray', style.lineDash.join(','));
    		}
    		else {
    			attr(svgEl, 'stroke-dasharray', '');
    		}
    		attr(svgEl, 'stroke-dashoffset', style.lineDashOffset || 0);

    		// PENDING
    		style.lineCap && attr(svgEl, 'stroke-linecap', style.lineCap);
    		style.lineJoin && attr(svgEl, 'stroke-linejoin', style.lineJoin);
    		style.miterLimit && attr(svgEl, 'stroke-miterlimit', style.miterLimit);
    	}
    	else {
    		attr(svgEl, 'stroke', NONE);
    	}
    }

    /***************************************************
     * PATH
     **************************************************/
	function pathDataToString(data) {
		var str = [];
		for (var i = 0; i < data.length;) {
			var cmd = data[i++];
			var cmdStr = '';
			var nData = 0;
			switch (cmd) {
				case CMD.M:
					cmdStr = 'M';
					nData = 2;
					break;
				case CMD.L:
					cmdStr = 'L';
					nData = 2;
					break;
				case CMD.Q:
					cmdStr = 'Q';
					nData = 4;
					break;
				case CMD.C:
					cmdStr = 'C';
					nData = 6;
					break;
				case CMD.A:
					cmdStr = 'A';
					nData = 8;
					break;
				case CMD.Z:
					cmdStr = 'Z';
					break;
			}
			str.push(cmdStr);
			for (var j = 0; j < nData; j++) {
				str.push(data[i++]);
			}
		}
		return str.join(' ');
	}

	var path = {};

	path.brush = function (el, svgRoot) {
		var style = el.style;

		var svgEl = el._svgEl;
		if (! svgEl) {
			svgEl = createElement('path');
			el._svgEl = svgEl;
		}

		var path = el._path;
		if (el.__dirtyPath) {
			path.beginPath();
			el.buildPath(path, el.shape);
			el.__dirtyPath = false;

			attr(svgEl, 'd', pathDataToString(path.data));
		}

		bindStyle(svgEl, style);
		setTransform(svgEl, el.transform);

		append(svgRoot, svgEl);
	};

	path.onRemoveFromStorage = function (el, svgRoot) {
		remove(svgRoot, el._svgEl);
	};

	path.onAddToStorage = function (el, svgRoot) {
		append(svgRoot, el._svgEl);
	};

	return {
		path: path
	}
});