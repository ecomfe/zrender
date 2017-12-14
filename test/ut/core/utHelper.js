(function (context) {

    /**
     * @public
     * @type {Object}
     */
    var helper = context.utHelper = {};

    var nativeSlice = Array.prototype.slice;

    /**
     * Usage:
     * var testCase = helper.prepare([
     *     'zrender/core/util'
     *     'zrender/tool/color'
     * ])
     *
     * testCase('test_case_1', function (util, colorTool) {
     *     // Real test case.
     *     // this.zrender can be visited.
     * });
     *
     * testCase.requireId(['zrender/tool/path'])('test_case_2', function (path) {
     *     // Real test case.
     *     // this.zrender can be visited.
     * });
     *
     * @public
     * @params {Array.<string>} [requireId] Like:
     * @return {Function} testCase function wrap.
     */
    helper.prepare = function (requireId) {

        window.beforeEach(function (done) {
            window.jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
            done();
        });

        return wrapTestCaseFn(genContext({requireId: requireId}));


        function wrapTestCaseFn(context) {

            var testCase = function (name, doTest) {

                var requireId = context.requireId;
                if (!(requireId instanceof Array)) {
                    requireId = requireId != null ? [] : [requireId];
                }
                requireId = ['zrender/src/zrender'].concat(requireId);

                window.it(name, function (done) {

                    window.requireES(requireId, onModuleLoaded);

                    function onModuleLoaded(zrender) {
                        var userScope = {
                            zrender: zrender
                        };
                        doTest.apply(
                            userScope,
                            Array.prototype.slice.call(arguments, 1)
                        );

                        done();
                    }
                });
            };

            testCase.requireId = function (requireId) {
                return wrapTestCaseFn(genContext({requireId: requireId}, context));
            };

            return testCase;
        }

        function genContext(props, originalContext) {
            var context = {};
            if (originalContext) {
                for (var key in originalContext) {
                    if (originalContext.hasOwnProperty(key)) {
                        context[key] = originalContext[key];
                    }
                }
            }
            if (props) {
                for (var key in props) {
                    if (props.hasOwnProperty(key)) {
                        context[key] = props[key];
                    }
                }
            }
            return context;
        }
    };

    /**
     * @param {*} target
     * @param {*} source
     */
    helper.extend = function (target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    };

    /**
     * @public
     */
    helper.g = function (id) {
        return document.getElementById(id);
    };

    /**
     * @public
     */
    helper.removeEl = function (el) {
        var parent = helper.parentEl(el);
        parent && parent.removeChild(el);
    };

    /**
     * @public
     */
    helper.parentEl = function (el) {
        //parentElement for ie.
        return el.parentElement || el.parentNode;
    };

    /**
     * 得到head
     *
     * @public
     */
    helper.getHeadEl = function (s) {
        return document.head
            || document.getElementsByTagName('head')[0]
            || document.documentElement;
    };

    /**
     * @public
     */
    helper.curry = function (func) {
        var args = nativeSlice.call(arguments, 1);
        return function () {
            return func.apply(this, args.concat(nativeSlice.call(arguments)));
        };
    };

    /**
     * @public
     */
    helper.bind = function (func, context) {
        var args = nativeSlice.call(arguments, 2);
        return function () {
            return func.apply(context, args.concat(nativeSlice.call(arguments)));
        };
    };

    /**
     * Load javascript script
     *
     * @param {string} resource Like 'xx/xx/xx.js';
     */
    helper.loadScript = function (url, id, callback) {
        var head = helper.getHeadEl();

        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'utf-8');
        if (id) {
            script.setAttribute('id', id);
        }
        script.setAttribute('src', url);

        // @see jquery
        // Attach handlers for all browsers
        script.onload = script.onreadystatechange = function () {

            if (!script.readyState || /loaded|complete/.test(script.readyState)) {
                // Handle memory leak in IE
                script.onload = script.onreadystatechange = null;
                // Dereference the script
                script = undefined;
                callback && callback();
            }
        };

        // Use insertBefore instead of appendChild  to circumvent an IE6 bug.
        // This arises when a base node is used (jquery #2709 and #4378).
        head.insertBefore(script, head.firstChild);
    };

    /**
     * @public
     */
    helper.isValueFinite = function (val) {
        return val != null && val !== '' && isFinite(val);
    };

    helper.getGraphicElements = function (chartOrGroup, mainType, index) {
        if (chartOrGroup.type === 'group') {
            return chartOrGroup.children();
        }
        else {
            var viewGroup = helper.getViewGroup(chartOrGroup, mainType, index);
            if (viewGroup) {
                var list = [viewGroup];
                viewGroup.traverse(function (el) {
                    list.push(el);
                });
                return list;
            }
            else {
                return [];
            }
        }
    };

    helper.getViewGroup = function (chart, mainType, index) {
        var component = chart.getModel().getComponent(mainType, index);
        return component ? chart[
            mainType === 'series' ? '_chartsMap' : '_componentsMap'
        ][component.__viewId].group : null;
    };

    /**
     * @public
     */
    helper.printElement = function (el) {
        var result = {};
        var props = ['position', 'scale', 'rotation', 'style', 'shape'];
        for (var i = 0; i < props.length; i++) {
            result[props[i]] = el[props[i]];
        }
        return window.JSON.stringify(result, null, 4);
    };

    /**
     * @public
     */
    helper.print = function (str) {
        if (typeof console !== 'undefined') {
            console.log(str);
        }
    };

})(window);