(function () {

    var testHelper = window.testHelper = {};
    var objToString = Object.prototype.toString;


    // Set default renderer in dev mode from hash.
    var matchResult = location.href.match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
    if (matchResult) {
        window.__ZRENDER__DEFAULT__RENDERER__ = matchResult[1];
    }

    // ----------------------------
    // Hash Storage
    // ----------------------------

    (function (exports) {

        var _urlStorageInitialized;
        var _hashSegmentKey = 'zrTestHashStorage';
        var _searchSegmentKey = 'zrTestSearchStorage';
        var _modes = {
            // Do not need to escapse for RegExp because the characters in key is safe.
            // Hash segment is ended with '&' because it can be escapsed by
            // `encodeURIComponent` but it is a valid URL character.
            hash: {
                segmentKey: _hashSegmentKey,
                segmentReg: new RegExp('(&' + _hashSegmentKey + '=)([^&]+)(&)'),
                emptyStorageSegment: makeStorageSegment('hash', _hashSegmentKey, {}),
                getCurrentAll: function () {
                    return (location.hash || '').replace(/^#/, '');
                }
            },
            search: {
                segmentKey: _searchSegmentKey,
                segmentReg: new RegExp('(&' + _searchSegmentKey + '=)([^&]+)(&)'),
                emptyStorageSegment: makeStorageSegment('search', _searchSegmentKey, {}),
                getCurrentAll: function () {
                    return (location.search || '').replace(/^\?/, '');
                }
            }
        };

        /**
         * @public
         * @param {Function} [updateView] Will be called in `init` and when hash changed.
         *        no args and no return.
         */
        exports.initURLStorage = function (updateView) {
            if (_urlStorageInitialized) {
                return;
            }
            _urlStorageInitialized = true;

            // export to window for visit cross iframe.
            window.zrTestURLStorage = exports;

            function doUpdateView() {
                updateView && updateView(); // no arguments.
            }
            window.addEventListener('hashchange', doUpdateView, true);
            doUpdateView();
        };

        /**
         * Get entire storage both from location hash and location search.
         * location hash has higer priority if key overlapped.
         * @public
         * @return {Object} Never returns `null`/`undefined`.
         */
        exports.getAllFromURL = function () {
            checkStorageInitialized();

            return testHelper.extend(
                exports.getAllFromSearch(),
                exports.getAllFromHash()
            );
        };

        /**
         * Get entire storage only from location hash.
         * @public
         * @return {Object} Never returns `null`/`undefined`.
         */
        exports.getAllFromHash = function () {
            return retrieveStorage('hash') || {};
        };

        /**
         * Get entire storage only from location search.
         * @public
         * @return {Object} Never returns `null`/`undefined`.
         */
        exports.getAllFromSearch = function () {
            return retrieveStorage('search') || {};
        };

        /**
         * Set to location.hash, trigger hash change and `updateView`.
         * @public
         * @param {Object|string} key or kvMap.
         * @param {*} value value Must be able to be JSON stringified.
         *        If intending to remove the key, just set value as undefined.
         */
        exports.updateToHash = function (key, value) {
            checkStorageInitialized();
            var newAllHash = makeNewURLPart('hash', key, value);
            location.hash = '#' + newAllHash;
        };

        /**
         * Set to location.search, trigger the entire page reload if search changed.
         * If intending to force reload, just call `location.reload()` manually
         * after this invocation.
         * @public
         * @param {Object|string} key or kvMap.
         * @param {*} value value Must be able to be JSON stringified.
         *        If intending to remove the key, just set value as undefined.
         */
        exports.updateToSearch = function (key, value) {
            checkStorageInitialized();
            var newAllSearch = makeNewURLPart('search', key, value);
            location.search = '?' + newAllSearch;
        };

        /**
         * @public
         * @param {Object} params key-value map. value value Must be able to be JSON stringified.
         * @return {string} segment enable in location.hash
         */
        exports.makeHashStorageSegment = function (params) {
            return makeStorageSegment('hash', _hashSegmentKey, params);
        };

        /**
         * @public
         * @param {Object} params key-value map. value value Must be able to be JSON stringified.
         * @return {string} segment enable in location.search
         */
        exports.makeSearchStorageSegment = function (params) {
            return makeStorageSegment('search', _searchSegmentKey, params);
        };

        function makeStorageSegment(mode, segmentKey, params) {
            return '&' + segmentKey + '=' + makeStorageSegmentPart(params) + '&';
        }

        function makeNewURLPart(mode, key, value) {
            var kvMap = key;
            if (testHelper.isString(key)) {
                kvMap = {};
                kvMap[key] = value;
            }

            var urlPart = _modes[mode].getCurrentAll();

            var storage = retrieveStorage(mode);
            if (!storage) {
                urlPart += _modes[mode].emptyStorageSegment;
                storage = {};
            }

            for (var key in kvMap) {
                if (kvMap.hasOwnProperty(key)) {
                    storage[key] = kvMap[key];
                }
            }

            var storageSegmentPart = makeStorageSegmentPart(storage);
            var newURLPart = urlPart.replace(_modes[mode].segmentReg, function (_, pre, content, post) {
                return pre + storageSegmentPart + post;
            });

            return newURLPart;
        }

        function retrieveStorage(mode) {
            var currentAll = _modes[mode].getCurrentAll();
            var matchResult = currentAll.match(_modes[mode].segmentReg);
            if (matchResult && matchResult[2]) {
                return JSON.parse(decodeURIComponent(matchResult[2]));
            }
        }

        function makeStorageSegmentPart(storage) {
            return encodeURIComponent(JSON.stringify(storage));
        }

        function checkStorageInitialized() {
            assert(_urlStorageInitialized, '`testHelper.initHashStorage` must be called firstly.');
        }

    })(testHelper);



    // ----------------------------
    // DOM event listener
    // ----------------------------

    testHelper.on = function (el, eventType, listener) {
        var listeners = el.__listeners || (el.__listeners = []);
        listeners.push(listener);
        el.addEventListener(eventType, listener, true);
    };

    testHelper.off = function (el, eventType) {
        var listeners = el.__listeners;
        if (listeners) {
            for (var i = 0; i < listeners.length; i++) {
                var listener = listeners[i];
                el.removeEventListener(eventType, listener);
            }
        }
    };



    // -----------------------------
    // Others
    // -----------------------------

    testHelper.encodeHTML = function (source) {
        return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    testHelper.dir = function () {
        return location.origin + testHelper.resolve(location.pathname, '..');
    };

    // Nodejs `path.resolve`.
    testHelper.resolve = function () {
        var resolvedPath = '';
        var resolvedAbsolute;

        for (var i = arguments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
            var path = arguments[i];
            if (path) {
                resolvedPath = path + '/' + resolvedPath;
                resolvedAbsolute = path[0] === '/';
            }
        }

        assert(resolvedAbsolute, 'At least one absolute path should be input.');

        // Normalize the path
        resolvedPath = normalizePathArray(resolvedPath.split('/'), false).join('/');

        return '/' + resolvedPath;
    };

    // resolves . and .. elements in a path array with directory names there
    // must be no slashes or device names (c:\) in the array
    // (so also no leading and trailing slashes - it does not distinguish
    // relative and absolute paths)
    function normalizePathArray(parts, allowAboveRoot) {
        var res = [];
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];

            // ignore empty parts
            if (!p || p === '.') {
                continue;
            }

            if (p === '..') {
                if (res.length && res[res.length - 1] !== '..') {
                    res.pop();
                }
                else if (allowAboveRoot) {
                    res.push('..');
                }
            }
            else {
                res.push(p);
            }
        }

        return res;
    }

    /**
     * @public
     * @param {*} value
     * @return {boolean}
     */
    testHelper.isObject = function (value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return type === 'function' || (!!value && type === 'object');
    };

    testHelper.isString = function (value) {
        return objToString.call(value) === '[object String]';
    };

    testHelper.isNumber = function (value) {
        return objToString.call(value) === '[object Number]';
    };

    testHelper.isArray = function (value) {
        return objToString.call(value) === '[object Array]';
    };

    /**
     * @param {*} target
     * @param {*} source
     */
    testHelper.extend = function (target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    };

    /**
     * Not exactly the same as `Object.keys` but been enough to use.
     * @param {Object} obj
     * @return {Array} keys
     */
    testHelper.keys = function (obj) {
        var keys = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    };

    testHelper.deeplyEquals = function (obj1, obj2) {
        if (obj1 === obj2) {
            return true;
        }
        // NaN !== NaN
        if (testHelper.isNumber(obj1) && testHelper.isNumber(obj2) && isNaN(obj1) && isNaN(obj2)) {
            return true;
        }

        if (testHelper.isArray(obj1) && testHelper.isArray(obj2)) {
            if (obj1.length !== obj2.length) {
                return false;
            }
            var theSame = true;
            for (var i = 0; i < obj1.length; i++) {
                theSame &= testHelper.deeplyEquals(obj1[i], obj2[i]);
            }
            return theSame;
        }
        else if (testHelper.isObject(obj1) && testHelper.isObject(obj2)) {
            var keys1 = testHelper.keys(obj1);
            var keys2 = testHelper.keys(obj2);
            if (keys1.length !== keys2.length) {
                return false;
            }
            var theSame = true;
            for (var i = 0; i < keys1.length; i++) {
                theSame &= testHelper.deeplyEquals(obj1[keys1[i]], obj2[keys2[i]]);
            }
            return theSame;
        }

        return false;
    };

    var assert = testHelper.assert = function (condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    };

})();