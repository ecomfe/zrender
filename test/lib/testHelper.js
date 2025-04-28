(function () {

    var testHelper = window.testHelper = {};
    var objToString = Object.prototype.toString;


    // Set default renderer in dev mode from hash.
    var rendererMatchResult = location.href.match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
    if (rendererMatchResult) {
        window.__ZRENDER__DEFAULT__RENDERER__ = rendererMatchResult[1];
    }

    var coarsePointerMatchResult = location.href.match(/[?&]__COARSE__POINTER__=(true|false|auto)(&|$)/);
    if (coarsePointerMatchResult) {
        window.__ZRENDER__DEFAULT__COARSE_POINTER =
            coarsePointerMatchResult[1] === 'true'
                ? true
                : coarsePointerMatchResult[1] === 'false'
                    ? false
                    : 'auto';
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

    var encodeJSObjectKey = function (source, quotationMark) {
        source = '' + source;
        if (!/^[a-zA-Z$_][a-zA-Z0-9$_]*$/.test(source)) {
            source = convertStringToJSLiteral(source, quotationMark);
        }
        return source;
    };

    var convertStringToJSLiteral = function (str, quotationMark) {
        // assert(getType(str) === 'string');
        // assert(quotationMark === '"' || quotationMark === "'");
        str = JSON.stringify(str); // escapse \n\r or others.
        if (quotationMark === "'") {
            str = "'" + str.slice(1, str.length - 1).replace(/'/g, "\\'") + "'";
        }
        return str;
    }

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

    /**
     * Not accurate.
     * @param {*} type
     * @return {string} 'function', 'array', 'typedArray', 'regexp',
     *       'date', 'object', 'boolean', 'number', 'string'
     */
    var getType = testHelper.getType = function (value) {
        var type = typeof value;
        var typeStr = objToString.call(value);

        return !!TYPED_ARRAY[objToString.call(value)]
            ? 'typedArray'
            : typeof value === 'function'
            ? 'function'
            : typeStr === '[object Array]'
            ? 'array'
            : typeStr === '[object Number]'
            ? 'number'
            : typeStr === '[object Boolean]'
            ? 'boolean'
            : typeStr === '[object String]'
            ? 'string'
            : typeStr === '[object RegExp]'
            ? 'regexp'
            : typeStr === '[object Date]'
            ? 'date'
            : !!value && type === 'object'
            ? 'object'
            : null;
    };

    /**
     * JSON.stringify(obj, null, 2) will vertically layout array, which takes too much space.
     * Can print like:
     * [
     *     {name: 'xxx', value: 123},
     *     {name: 'xxx', value: 123},
     *     {name: 'xxx', value: 123}
     * ]
     * {
     *     arr: [33, 44, 55],
     *     str: 'xxx'
     * }
     *
     * @param {*} object
     * @param {opt|string} [opt] If string, means key.
     * @param {string} [opt.key=''] Top level key, if given, print like: 'someKey: [asdf]'
     * @param {number} [opt.lineBreakMaxColumn=80] If the content in a single line is greater than
     *  `maxColumn` (indent is not included), line break.
     * @param {boolean} [opt.objectLineBreak=undefined] Whether to line break. undefined/null means auto.
     * @param {boolean} [opt.arrayLineBreak=undefined] Whether to line break. undefined/null means auto.
     * @param {string} [opt.indent=4]
     * @param {string} [opt.marginLeft=0] Spaces number for margin left of the entire text.
     * @param {string} [opt.lineBreak='\n']
     * @param {string} [opt.quotationMark="'"] "'" or '"'.
     */
    var printObject = testHelper.printObject = function (obj, opt) {
        opt = typeof opt === 'string'
            ? {key: opt}
            : (opt || {});

        var indent = opt.indent != null ? opt.indent : 4;
        var lineBreak = opt.lineBreak != null ? opt.lineBreak : '\n';
        var quotationMark = ({'"': '"', "'": "'"})[opt.quotationMark] || "'";
        var marginLeft = opt.marginLeft || 0;
        var lineBreakMaxColumn = opt.lineBreakMaxColumn || 80;
        var forceObjectLineBreak = opt.objectLineBreak === true || opt.objectLineBreak === false;
        var forceArrayLineBreak = opt.arrayLineBreak === true || opt.arrayLineBreak === false;

        return (new Array(marginLeft + 1)).join(' ') + doPrint(obj, opt.key, 0).str;

        function doPrint(obj, key, depth) {
            var codeIndent = (new Array(depth * indent + marginLeft + 1)).join(' ');
            var subCodeIndent = (new Array((depth + 1) * indent + marginLeft + 1)).join(' ');
            var hasLineBreak = false;
            //  [
            //      11, 22, 33, 44, 55, 66, // This is a partial break.
            //      77, 88, 99
            //  ]
            var preventParentArrayPartiallyBreak = false;

            var preStr = '';
            if (key != null) {
                preStr += encodeJSObjectKey(key, quotationMark) + ': ';
            }
            var str;

            var objType = getType(obj);

            switch (objType) {
                case 'function':
                    hasLineBreak = true;
                    preventParentArrayPartiallyBreak = true;
                    var fnStr = obj.toString();
                    var isMethodShorthand = key != null && isMethodShorthandNotAccurate(fnStr, obj.name, key);
                    str = (isMethodShorthand ? '' : preStr) + fnStr;
                    break;
                case 'regexp':
                case 'date':
                    str = preStr + quotationMark + obj + quotationMark;
                    break;
                case 'array':
                case 'typedArray':
                    if (forceArrayLineBreak) {
                        hasLineBreak = !!opt.arrayLineBreak;
                    }
                    // If no break line in array, print in single line, like [12, 23, 34].
                    // else, each item takes a line.
                    var childBuilder = [];
                    var maxColumnWithoutLineBreak = preStr.length;
                    var canPartiallyBreak = true;
                    for (var i = 0, len = obj.length; i < len; i++) {
                        var subResult = doPrint(obj[i], null, depth + 1);
                        childBuilder.push(subResult.str);

                        if (subResult.hasLineBreak) {
                            hasLineBreak = true;
                        }
                        else {
                            maxColumnWithoutLineBreak += subResult.str.length + 2; // `2` is ', '.length
                        }

                        if (subResult.preventParentArrayPartiallyBreak) {
                            preventParentArrayPartiallyBreak = true;
                            canPartiallyBreak = false
                        }
                    }
                    if (obj.length > 3) {
                        // `3` is an arbitrary value, considering a path array:
                        //  [
                        //      [1,2], [3,4], [5,6],
                        //      [7,8], [9,10]
                        //  ]
                        preventParentArrayPartiallyBreak = true;
                    }
                    if (!forceObjectLineBreak && maxColumnWithoutLineBreak > lineBreakMaxColumn) {
                        hasLineBreak = true;
                    }
                    var tail = hasLineBreak ? lineBreak : '';
                    var subPre = hasLineBreak ? subCodeIndent : '';
                    var endPre = hasLineBreak ? codeIndent : '';
                    var delimiterInline = ', ';
                    var delimiterBreak = ',' + lineBreak + subCodeIndent;
                    if (!childBuilder.length) {
                        str = preStr + '[]';
                    }
                    else {
                        var subContentStr = '';
                        var subContentMaxColumn = 0;
                        if (canPartiallyBreak && hasLineBreak) {
                            for (var idx = 0; idx < childBuilder.length; idx++) {
                                var childStr = childBuilder[idx];
                                subContentMaxColumn += childStr.length + delimiterInline.length;
                                if (idx === childBuilder.length - 1) {
                                    subContentStr += childStr;
                                }
                                else if (subContentMaxColumn > lineBreakMaxColumn) {
                                    subContentStr += childStr + delimiterBreak;
                                    subContentMaxColumn = 0;
                                }
                                else {
                                    subContentStr += childStr + delimiterInline;
                                }
                            }
                        }
                        else {
                            subContentStr = childBuilder.join(hasLineBreak ? delimiterBreak : delimiterInline);
                        }
                        str = ''
                            + preStr + '[' + tail
                            + subPre + subContentStr + tail
                            + endPre + ']';
                    }
                    break;
                case 'object':
                    if (forceObjectLineBreak) {
                        hasLineBreak = !!opt.objectLineBreak;
                    }
                    var childBuilder = [];
                    var maxColumnWithoutLineBreak = preStr.length;
                    var keyCount = 0;
                    for (var i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            keyCount++;
                            var subResult = doPrint(obj[i], i, depth + 1);
                            childBuilder.push(subResult.str);

                            if (subResult.hasLineBreak) {
                                hasLineBreak = true;
                            }
                            else {
                                maxColumnWithoutLineBreak += subResult.str.length + 2; // `2` is ', '.length
                            }

                            if (subResult.preventParentArrayPartiallyBreak) {
                                preventParentArrayPartiallyBreak = true;
                            }
                        }
                    }
                    if (keyCount > 1) {
                        // `3` is an arbitrary value, considering case like:
                        //  [
                        //      {name: 'xx'}, {name: 'yy'}, {name: 'zz'},
                        //      {name: 'aa'}, {name: 'bb'}
                        //  ]
                        preventParentArrayPartiallyBreak = true;
                    }
                    if (!forceObjectLineBreak && maxColumnWithoutLineBreak > lineBreakMaxColumn) {
                        hasLineBreak = true;
                    }
                    if (!childBuilder.length) {
                        str = preStr + '{}';
                    }
                    else {
                        str = ''
                            + preStr + '{' + (hasLineBreak ? lineBreak : '')
                                + (hasLineBreak ? subCodeIndent : '')
                                + childBuilder.join(',' + (hasLineBreak ? lineBreak + subCodeIndent: ' '))
                                + (hasLineBreak ? lineBreak: '')
                            + (hasLineBreak ? codeIndent : '') + '}';
                    }
                    break;
                case 'boolean':
                case 'number':
                    str = preStr + obj + '';
                    break;
                case 'string':
                    str = preStr + convertStringToJSLiteral(obj, quotationMark);
                    break;
                default:
                    str = preStr + obj + '';
                    preventParentArrayPartiallyBreak = true;
            }

            return {
                str: str,
                hasLineBreak: hasLineBreak,
                isMethodShorthand: isMethodShorthand,
                preventParentArrayPartiallyBreak: preventParentArrayPartiallyBreak
            };
        }

        /**
         * Simple implementation for detecting method shorthand, such as,
         *  ({abc() { return 1; }}).abc   is a method shorthand and needs to
         *  be serialized as `{abc() { return 1; }}` rather than `{abc: abc() { return 1; }}`.
         * Those cases can be detected:
         *   ({abc() { console.log('=>'); return 1; }}).abc   expected: IS_SHORTHAND
         *   ({abc(x, y = 5) { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({$ab_c() { return 1; }}).$ab_c   expected: IS_SHORTHAND
         *   ({*abc() { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({*  abc() { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({async   abc() { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({*abc() { yield 1; }}).abc   expected: IS_SHORTHAND
         *   ({abc(x, y) { return x + y; }}).abc   expected: IS_SHORTHAND
         *   ({abc: function abc() { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function def() { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function() { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function* () { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function (aa, bb) { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function (aa, bb = 5) { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: async () => { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: () => { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: (aa, bb = 5) => { return 1; }}).abc   expected: NOT_SHORTHAND
         * FIXME: fail at some rare cases, such as:
         *   Literal string involved, like:
         *      ({"ab-() ' =>c"() { return 1; }})["ab-() ' =>c"]   expected: IS_SHORTHAND
         *      ({async "ab-c"() { return 1; }})["ab-c"]   expected: IS_SHORTHAND
         *   Computed property name involved, like:
         *      ({[some]() { return 1; }})[some]   expected: IS_SHORTHAND
        */
        function isMethodShorthandNotAccurate(fnStr, fnName, objKey) {
            // Assert fnStr, fnName, objKey is a string.
            if (fnName !== objKey) {
                return false;
            }
            var matched = fnStr.match(/^\s*(async\s+)?(function\s*)?(\*\s*)?([a-zA-Z$_][a-zA-Z0-9$_]*)?\s*\(/);
            if (!matched) {
                return false;
            }
            if (matched[2]) { // match 'function'
                return false;
            }
            // May enhanced by /(['"])(?:(?=(\\?))\2.)*?\1/; to match literal string,
            // such as "ab-c", "a\nc". But this simple impl does not cover it.
            if (!matched[4] || matched[4] !== objKey) { // match "maybe function name"
                return false;
            }
            return true;
        }

    };

    var copyToClipboard = function (text) {
        if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.writeText) {
            console.error('[clipboard] Can not copy to clipboard.');
            return;
        }
        return navigator.clipboard.writeText(text).then(function () {
            console.log('[clipboard] Text copied to clipboard.');
        }).catch(function (err) {
            console.error('[clipboard] Failed to copy text: ', err); // Just print for easy to use.
            return err;
        });
    };

    /**
     * A shortcut for both stringify and copy to clipboard.
     *
     * @param {any} val Any val to stringify and copy to clipboard.
     * @param {Object?} printObjectOpt Optional.
     */
    testHelper.clipboard = function (val, printObjectOpt) {
        var literal = testHelper.printObject(val, printObjectOpt);
        if (document.hasFocus()) {
            copyToClipboard(literal);
        }
        else {
            // Handle the error:
            //  NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.
            ensureClipboardButton();
            updateClipboardButton(literal)
            console.log(
                '⚠️ [clipboard] Please click the new button that appears on the top-left corner of the screen'
                + ' to copy to clipboard.'
            );
        }

        function updateClipboardButton(text) {
            var button = __tmpClipboardButttonWrapper.button;
            button.innerHTML = 'Click me to copy to clipboard';
            button.style.display = 'block';
            __tmpClipboardButttonWrapper.text = text;
        }

        function ensureClipboardButton() {
            var button = __tmpClipboardButttonWrapper.button;
            if (button != null) {
                return;
            }
            __tmpClipboardButttonWrapper.button = button = document.createElement('div');
            button.style.cssText = [
                'height: 80px;',
                'line-height: 80px;',
                'padding: 10px 20px;',
                'margin: 5px;',
                'text-align: center;',
                'position: fixed;',
                'top: 10px;',
                'left: 10px;',
                'z-index: 9999;',
                'cursor: pointer;',
                'color: #fff;',
                'background-color: #333;',
                'border: 2px solid #eee;',
                'border-radius: 5px;',
                'font-size: 18px;',
                'font-weight: bold;',
                'font-family: sans-serif;',
                'box-shadow: 0 4px 10px rgba(0, 0, 0, 0.8);'
            ].join('');
            document.body.appendChild(button);
            button.addEventListener('click', function () {
                copyToClipboard(__tmpClipboardButttonWrapper.text).then(function (err) {
                    if (!err) {
                        button.style.display = 'none';
                    }
                    else {
                        button.innerHTML = 'error, see console log.';
                    }
                });
            });
        }
        // Do not return the text, because it may be too long for a console.log.
    };
    var __tmpClipboardButttonWrapper = {};

    var objToString = Object.prototype.toString;
    var TYPED_ARRAY = {
        '[object Int8Array]': 1,
        '[object Uint8Array]': 1,
        '[object Uint8ClampedArray]': 1,
        '[object Int16Array]': 1,
        '[object Uint16Array]': 1,
        '[object Int32Array]': 1,
        '[object Uint32Array]': 1,
        '[object Float32Array]': 1,
        '[object Float64Array]': 1
    };

    /**
     * Not accurate.
     * @param {*} type
     * @return {string} 'function', 'array', 'typedArray', 'regexp',
     *       'date', 'object', 'boolean', 'number', 'string'
     */
    var getType = testHelper.getType = function (value) {
        var type = typeof value;
        var typeStr = objToString.call(value);

        return !!TYPED_ARRAY[objToString.call(value)]
            ? 'typedArray'
            : typeof value === 'function'
            ? 'function'
            : typeStr === '[object Array]'
            ? 'array'
            : typeStr === '[object Number]'
            ? 'number'
            : typeStr === '[object Boolean]'
            ? 'boolean'
            : typeStr === '[object String]'
            ? 'string'
            : typeStr === '[object RegExp]'
            ? 'regexp'
            : typeStr === '[object Date]'
            ? 'date'
            : !!value && type === 'object'
            ? 'object'
            : null;
    };

})();