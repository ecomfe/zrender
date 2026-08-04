/**
 * @file Test case for Element animation APIs.
 *
 * NOTICE:
 *  This file is imported by both browser (for debug)
 *  and `test/ut/` (jest) for regression testing.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // CommonJS
    } else {
        root.__ZR_ANIMATION_API_TEST_CASES__ = factory(); // Browser global
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

    // For debugging test cases.
    // var ONLY_RUN_SINGLE_TEST_ID = 'during_with_ELEMENT_ANIMATION_PROPS_NONE';
    var ONLY_RUN_SINGLE_TEST_ID = null;


    // ------------------------------------------------------------------
    //                          TEST UTILITIES
    // ------------------------------------------------------------------

    function assert(condition, msg) {
        if (!condition) {
            throw new Error('Assertion failed' + (msg ? ': ' + msg : '.'));
        }
    }

    function compareLog(actualLog, expectedLogList) {
        assert(arguments.length === 2);
        if (actualLog.length !== expectedLogList.length) {
            return false;
        }
        for (var idx = 0; idx < actualLog.length; idx++) {
            if (actualLog[idx] !== expectedLogList[idx]) {
                return false;
            }
        }
        return true;
    }

    function isArray(value) {
        if (Array.isArray) {
            return Array.isArray(value);
        }
        return Object.prototype.toString.call(value) === '[object Array]';
    }

    function isObject(value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return type === 'function' || (!!value && type === 'object');
    }

    function isNumber(value) {
        return typeof value === 'number';
    }

    function isString() {
        return typeof value === 'string';
    }

    /**
     * Compare the specific `props`.
     * If `isObject` or `isArray`, deep into compare.
     * Otherwise, compare with `===`.
     * If array, must length the same.
     * If object, allow to not list all props.
     * @usage propsEqual(prepared.el, {x: 10, shape: {width: 100})
     */
    function propsDeepContain(targetObj, props) {
        assert(arguments.length === 2);
        if (isArray(props)) {
            if (!isArray(targetObj)) {
                return false;
            }
            if (targetObj.length !== props.length) {
                return false;
            }
            for (var i = 0; i < props.length; i++) {
                if (!propsDeepContain(targetObj[i], props[i])) {
                    return false;
                }
            }
            return true;
        }
        else if (isObject(props)) {
            if (!isObject(targetObj)) {
                return false;
            }
            for (var key in props) {
                if (props.hasOwnProperty(key)) {
                    if (!propsDeepContain(targetObj[key], props[key])) {
                        return false;
                    }
                }
            }
            return true;
        }
        // No case need to compare to null/undefined. Tighten the rules to avoid typo.
        else if (!isString(targetObj) && !isNumber(targetObj)) {
            return false;
        }
        else {
            return targetObj === props;
        }
    }

    function countInList(list, item) {
        assert(list.length != null && arguments.length === 2);
        var count = 0;
        for (var i = 0; i < list.length; i++) {
            if (list[i] === item) {
                count++;
            }
        }
        return count;
    }

    function noDuplicateString(strList, prefix) {
        assert(strList.length != null && arguments.length === 2);
        var dupSet = {};
        for (var i = 0; i < strList.length; i++) {
            var str = strList[i];
            if (str.indexOf(prefix) === 0) {
                if (dupSet.hasOwnProperty(str)) {
                    return false;
                }
                dupSet[str] = true;
            }
        }
        return true;
    }

    // @param check: (isCleanCb: boolean) => void
    function classifyMethodByCleanCb(method, check) {
        if (method === elAnimateTo || method === elAnimateFrom || method === elAnimateToSetToFinal) {
            check(false);
        }
        else if (method === elAnimateToCleanCb || method === elAnimateFromCleanCb) {
            check(true);
        }
        else {
            assert(false);
        }
    }

    // @param check: (isTo: boolean) => void
    function classifyMethodByToFrom(method, check) {
        if (method === elAnimateTo || method === elAnimateToCleanCb || method === elAnimateToSetToFinal) {
            check(true);
        }
        else if (method === elAnimateFrom || method === elAnimateFromCleanCb) {
            check(false);
        }
        else {
            assert(false);
        }
    }

    function cleanLog(preparedLog) {
        preparedLog.length = 0;
    }

    // Whether `animatorsSupper` includes `animatorsSub`
    function animatorsInclude(animatorsSupper, animatorsSub) {
        assert(animatorsSupper.length != null && animatorsSub.length != null && arguments.length === 2);
        for (var i = 0; i < animatorsSub.length; i++) {
            if (animatorsSupper.indexOf(animatorsSub[i]) < 0) {
                return false;
            }
        }
        return true;
    }

    // opCount: omit or '===' or '<=' or '>=' or '<' or '>'
    function findAnimatorByTargetNameCheckCount(animators, targetName, expectedCount, opCount) {
        assert(targetName != null && animators.length != null && expectedCount != null);
        assert(arguments.length === 3 || arguments.length === 4);
        var ret = [];
        for (var i = 0; i < animators.length; i++) {
            if (animators[i].targetName === targetName) {
                ret.push(animators[i]);
            }
        }

        if (opCount == null) {
            opCount = '===';
        }

        if (opCount === '===') {
            assert(ret.length === expectedCount);
        }
        else if (opCount === '<=') {
            assert(ret.length <= expectedCount);
        }
        else if (opCount === '>=') {
            assert(ret.length >= expectedCount);
        }
        else if (opCount === '<') {
            assert(ret.length < expectedCount);
        }
        else if (opCount === '>') {
            assert(ret.length > expectedCount);
        }
        else {
            assert(false);
        }

        return ret;
    }


    var elAnimateTo = function (el, props, cfg, animationProps) {
        el.animateTo(props, cfg, animationProps);
    }
    var elAnimateToCleanCb = function (el, props, cfg, animationProps) {
        var cfg2 = Object.assign({}, cfg);
        cfg2.cleanCb = true;
        el.animateTo(props, cfg2, animationProps);
    };
    var elAnimateToSetToFinal = function (el, props, cfg, animationProps) {
        var cfg2 = Object.assign({}, cfg);
        cfg2.setToFinal = true;
        el.animateTo(props, cfg2, animationProps);
    };
    var elAnimateFrom = function (el, props, cfg, animationProps) {
        el.animateFrom(props, cfg, animationProps);
    }
    var elAnimateFromCleanCb = function (el, props, cfg, animationProps) {
        var cfg2 = Object.assign({}, cfg);
        cfg2.cleanCb = true;
        el.animateFrom(props, cfg2, animationProps);
    };

    function runCases(cases) {
        var promise = Promise.resolve();

        function addTest(caseFn) {
            promise = promise.then(function () {
                return caseFn();
            });
        }
        for (var caseIdx = 0; caseIdx < cases.length; caseIdx++) {
            if (
                ONLY_RUN_SINGLE_TEST_ID == null || cases[caseIdx].id === ONLY_RUN_SINGLE_TEST_ID
            ) {
                addTest(cases[caseIdx].caseFn);
            }
        }

        return promise;
    }

    function runStandalone(zrenderNS, zr, consoleLog) {
        var testSuite = createTestSuite(zrenderNS, consoleLog);
        return Promise.resolve()
            .then(function () {
                testSuite.beforeAll(zr);
                return runCases(testSuite.cases);
            })
            .then(function () {
                testSuite.afterAll();
                consoleLog('TEST PASSED.');
            });
    }


    function createTestSuite(zrenderNS, consoleLog) {
        var zr;
        var testGroup = new zrenderNS.Group();

        var DURATION = 300;
        var INIT_X = 1;
        var INIT_Y = 2;
        var INIT_SHAPE_X = 3;
        var INIT_SHAPE_Y = 4;
        var INIT_SHAPE_WIDTH = 50;
        var INIT_SHAPE_HEIGHT = 20;
        var INIT_STYLE_OPACITY = 0.1;
        var INIT_SCALE_X = 1;
        var INIT_SCALE_Y = 1;

        var ELEMENT_ANIMATION_PROPS_NONE = zrenderNS.ELEMENT_ANIMATION_PROPS_NONE;
        assert(ELEMENT_ANIMATION_PROPS_NONE != null);

        var _originalPlatformGetTime;
        var _mockedPlatformTimer = null;
        var MOCK_TIME_ADVANCE_PER_FRAME = 16;
        var TEST_CASE_LIST = [];


        function prepare() {
            testGroup.removeAll();

            var log = [];

            var el = new zrenderNS.Rect({
                x: INIT_X,
                y: INIT_Y,
                scaleX: INIT_SCALE_X,
                scaleY: INIT_SCALE_Y,
                shape: {x: INIT_SHAPE_X, y: INIT_SHAPE_Y, width: INIT_SHAPE_WIDTH, height: INIT_SHAPE_HEIGHT},
                style: {
                    opacity: INIT_STYLE_OPACITY,
                    fill: 'red'
                }
            });
            testGroup.add(el);

            function done1() {
                // consoleLog('done1');
                log.push('done1')
            }
            function done2() {
                // consoleLog('done2');
                log.push('done2');
            }
            function done3() {
                // consoleLog('done3');
                log.push('done3');
            }
            function aborted1() {
                // consoleLog('aborted1');
                log.push('aborted1');
            }
            function aborted2() {
                // consoleLog('aborted2');
                log.push('aborted2');
            }
            function aborted3() {
                // consoleLog('aborted3');
                log.push('aborted3');
            }
            function during1(percent) {
                // consoleLog('during1', percent);
                log.push('during1');
                log.push('during1_percent:' + percent);
                zr.refresh(); // Prevent zr from sleeping.
            }
            function during2(percent) {
                // consoleLog('during2', percent);
                log.push('during2');
                log.push('during2_percent:' + percent);
                zr.refresh(); // Prevent zr from sleeping.
            }
            function during3(percent) {
                // consoleLog('during3', percent);
                log.push('during3');
                log.push('during3_percent:' + percent);
                zr.refresh(); // Prevent zr from sleeping.
            }
            return {
                el: el,
                log: log,
                done1: done1,
                done2: done2,
                done3: done3,
                aborted1: aborted1,
                aborted2: aborted2,
                aborted3: aborted3,
                during1: during1,
                during2: during2,
                during3: during3
            };
        }

        function addTestCase(id, caseFn) {
            for (var idx = 0; idx < TEST_CASE_LIST.length; idx++) {
                assert(TEST_CASE_LIST[idx].id !== id, 'Duplicate test case id: ' + id);
            }
            TEST_CASE_LIST.push({id: id, caseFn: caseFn});
        }

        function beforeAll(zrInstance) {
            assert(!!zrInstance);
            zr = zrInstance;
            zr.add(testGroup);
            mockPlatformTimer();
        }

        function afterAll() {
            restorePlatformTimer();
            zr.remove(testGroup);
        }

        function wrapCases() {
            var cases = [];
            for (var caseIdx = 0; caseIdx < TEST_CASE_LIST.length; caseIdx++) {
                cases.push(
                    {
                        id: TEST_CASE_LIST[caseIdx].id,
                        caseFn: (function (caseIdx) {
                            return function () {
                                consoleLog('[Test Element Animation API]: caseIdx: ' + caseIdx + ', id: "' + TEST_CASE_LIST[caseIdx].id + '" ...');
                                return TEST_CASE_LIST[caseIdx].caseFn();
                            };
                        })(caseIdx)
                    }
                );
            }
            return cases;
        }

        function retrieveElCurrValues(el) {
            assert(el instanceof zrenderNS.Element);
            var ret = {};
            ret.x = el.x;
            ret.y = el.y;
            ret.scaleX = el.scaleX;
            ret.scaleY = el.scaleY;
            ret.style = {
                opacity: el.style.opacity
            };
            ret.shape = {
                x: el.shape.x,
                y: el.shape.y,
                width: el.shape.width,
                height: el.shape.height
            };
            return ret;
        }

        /**
         * This mock is to avoid test fail when program is paused by breaking points or
         * rAF may stops when browser looses focus.
         */
        function mockPlatformTimer() {
            _originalPlatformGetTime = zrenderNS.getPlatformAPI('getTime');
            _mockedPlatformTimer = 20 * 365 * 24 * 3600 * 1000; // An arbitrary start time.

            zrenderNS.setPlatformAPI({
                getTime: mockedGetTime
            });

            function advance() {
                requestAnimationFrame(function () {
                    if (_mockedPlatformTimer != null) {
                        _mockedPlatformTimer += MOCK_TIME_ADVANCE_PER_FRAME;
                        advance();
                    }
                });
            }
            advance();
        }

        function restorePlatformTimer() {
            assert(_originalPlatformGetTime != null);
            _mockedPlatformTimer = null; // Stop advance loop.
            zrenderNS.setPlatformAPI({getTime: _originalPlatformGetTime});
        }

        function mockedGetTime() {
            return _mockedPlatformTimer;
        }

        function promisifiedTimeOut(delay, payload) {
            // When browser looses focus, rAF may stops, but `setTimeout` continues.
            // Therefore we only use rAF as timer.
            return new Promise(function (resolve) {
                var timeStart = mockedGetTime();
                function next() {
                    requestAnimationFrame(function () {
                        if (mockedGetTime() - timeStart >= delay) {
                            resolve(payload);
                        }
                        else {
                            next();
                        }
                    });
                }
                next();
            });
        }

        // `count: 2` means next 2 rAF;
        function promisifiedNextFrame(count, payload) {
            assert(count > 0);
            return new Promise(function (resolve) {
                function next() {
                    if (count > 0) {
                        count--;
                        requestAnimationFrame(function () {
                            next();
                        });
                    }
                    else {
                        resolve(payload);
                    }
                }
                next();
            });
        }

        function promisifiedZRRenderedInFutherFrame(zr, payload) {
            return new Promise(function (resolve) {
                var frameFlag = 1;
                requestAnimationFrame(function () {
                    frameFlag++;
                });
                function handleZRFrame() {
                    if (frameFlag === 1) {
                        frameFlag++;
                        return;
                    }
                    zr.off('rendered', handleZRFrame); // Only once.
                    Promise.resolve().then(function () {
                        resolve(payload);
                    });
                }
                zr.on('rendered', handleZRFrame);
            });
        }


        // ------------------------------------------------------------------
        //                           TEST CASES
        // ------------------------------------------------------------------


        /**
         * Test normally one call to el.animateTo/el.animateFrom
         */
        addTestCase('normal_one_call_to_animateTo_animateFrom', function () {
            function testSingle(method) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    method(
                        prepared.el,
                        {scaleX: 5, x: 123, style: {opacity: 0.987}, shape: {y: 155}},
                        {
                            done: prepared.done1, during: prepared.during1, aborted: prepared.aborted1,
                            duration: DURATION
                        }
                    );

                    assert(prepared.el.animators.length === 3);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                        style: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'style', 1)[0],
                        shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                    };
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);

                    if (method === elAnimateTo || method === elAnimateToCleanCb) {
                        assert(propsDeepContain(prepared.el, {
                            scaleX: elOldVals.scaleX,
                            x: elOldVals.x,
                            style: {opacity: elOldVals.style.opacity},
                            shape: {y: elOldVals.shape.y}
                        }));
                    }
                    else if (method === elAnimateToSetToFinal) {
                        assert(propsDeepContain(prepared.el, {scaleX: 5, x: 123, style: {opacity: 0.987}, shape: {y: 155}}));
                    }
                    else if (method === elAnimateFrom || method === elAnimateFromCleanCb) {
                        assert(propsDeepContain(prepared.el, {scaleX: 5, x: 123, style: {opacity: 0.987}, shape: {y: 155}}));
                    }
                    assert(prepared.el.y === elOldVals.y);

                    record.first = {elOldVals: elOldVals};
                    return promisifiedNextFrame(2, elOldVals);

                }).then(function () { // Some animation frames have been processed.
                    assert(prepared.el.animators.length === 3);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                        style: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'style', 1)[0],
                        shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                    };
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);

                    assert(!countInList([5, record.first.elOldVals.scaleX], prepared.el.scaleX));
                    assert(!countInList([123, record.first.elOldVals.x], prepared.el.x));
                    assert(!countInList([0.987, record.first.elOldVals.style.opacity], prepared.el.style.opacity));
                    assert(!countInList([155, record.first.elOldVals.shape.y], prepared.el.shape.y));
                    assert(prepared.el.y === record.first.elOldVals.y);

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () { // After animation completes.
                    assert(prepared.el.animators.length === 0);
                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'done1') === 1);

                    if (method === elAnimateTo || method === elAnimateToCleanCb) {
                        assert(propsDeepContain(prepared.el, {scaleX: 5, x: 123, style: {opacity: 0.987}, shape: {y: 155}}));
                    }
                    else if (method === elAnimateToSetToFinal) {
                        assert(propsDeepContain(prepared.el, {scaleX: 5, x: 123, style: {opacity: 0.987}, shape: {y: 155}}));
                    }
                    else if (method === elAnimateFrom || method === elAnimateFromCleanCb) {
                        assert(propsDeepContain(prepared.el, {
                            scaleX: record.first.elOldVals.scaleX,
                            x: record.first.elOldVals.x,
                            style: {opacity: record.first.elOldVals.style.opacity},
                            shape: {y: record.first.elOldVals.shape.y}
                        }));
                    }
                    assert(prepared.el.y === record.first.elOldVals.y);
                });
            }
            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo); })
                .then(function () { return testSingle(elAnimateToCleanCb); })
                .then(function () { return testSingle(elAnimateToSetToFinal); })
                .then(function () { return testSingle(elAnimateFrom); })
                .then(function () { return testSingle(elAnimateFromCleanCb); });
        });

        /**
         * 2 calls to el.animateTo/el.animateFrom.
         * props (both level1 and level2) have intersection (but not fully contained) between the 2 calls.
         * call update twice in the same JS task.
         */
        addTestCase('2_calls_to_animateTo_animateFrom_prop_intersection', function () {

            function fistCall(prepared, method, record) {
                var elOldVals = retrieveElCurrValues(prepared.el);

                method(
                    prepared.el,
                    {scaleX: 5, scaleY: 9, x: 100, shape: {x: 21, y: 31}, style: {opacity: 0.456}},
                    {
                        done: prepared.done1, during: prepared.during1, aborted: prepared.aborted1,
                        duration: DURATION
                    }
                );

                assert(prepared.el.animators.length === 3);
                var existingAnimators = {
                    '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                    shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0],
                    style: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'style', 1)[0]
                };
                assert(countInList(prepared.log, 'during1_percent:1') === 0);
                assert(countInList(prepared.log, 'done1') === 0);

                record.first = {elOldVals: elOldVals, existingAnimators: existingAnimators};
            }

            function secondCallBeforeComplete(prepared, method, record) {
                var elOldVals = retrieveElCurrValues(prepared.el);

                method(
                    prepared.el,
                    {scaleX: 50, scaleY: 90, shape: {y: 310}, style: {opacity: 0.789}},
                    {
                        done: prepared.done2, during: prepared.during2, aborted: prepared.aborted2,
                        duration: DURATION
                    }
                );

                assert(prepared.el.animators.length === 5);
                var existingAnimatorsList2 = {
                    '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 2),
                    shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 2),
                    style: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'style', 1)
                };
                assert(countInList(existingAnimatorsList2[''], record.first.existingAnimators['']) === 1);
                assert(countInList(existingAnimatorsList2['shape'], record.first.existingAnimators['shape']) === 1);
                assert(countInList(existingAnimatorsList2['style'], record.first.existingAnimators['style']) === 0);

                assert(countInList(prepared.log, 'during1_percent:1') === 0);
                assert(countInList(prepared.log, 'done1') === 0);
                assert(countInList(prepared.log, 'during2_percent:1') === 0);
                assert(countInList(prepared.log, 'done2') === 0);

                if (method === elAnimateTo || method === elAnimateToCleanCb) {
                    assert(propsDeepContain(prepared.el, elOldVals));
                }
                else if (method === elAnimateToSetToFinal
                    || method === elAnimateFrom || method === elAnimateFromCleanCb
                ) {
                    assert(propsDeepContain(prepared.el, {
                        scaleX: 50,
                        scaleY: 90,
                        x: elOldVals.x,
                        shape: {x: elOldVals.shape.x, y: 310},
                        style: {opacity: 0.789}
                    }));
                }
                else {
                    assert(false);
                }

                record.second = {elOldVals: elOldVals};
            }

            function subsequentProcess(prepared, method, record) {
                return Promise.resolve().then(function () {
                    // Animation started but not finished.
                    return promisifiedNextFrame(2);

                }).then(function () {
                    // Check values changes during animation.
                    assert(!countInList([50, record.first.elOldVals.scaleX, record.second.elOldVals.scaleX], prepared.el.scaleX));
                    assert(!countInList([90, record.first.elOldVals.scaleY, record.second.elOldVals.scaleY], prepared.el.scaleY));
                    assert(!countInList([310, record.first.elOldVals.shape.y, record.second.elOldVals.shape.y], prepared.el.shape.y));
                    assert(!countInList([0.789, record.first.elOldVals.style.opacity, record.second.elOldVals.style.opacity], prepared.el.style.opacity));

                    return promisifiedTimeOut(DURATION * 1.5);

                }).then(function () {
                    assert(prepared.el.animators.length === 0);
                    classifyMethodByCleanCb(method, function (isCleanCb) {
                        // Some props in call1 are not stopped, so done1 can occur, but aborted1 does not occur.
                        assert(countInList(prepared.log, 'during1_percent:1') === (isCleanCb ? 0 : 1));
                        assert(countInList(prepared.log, 'done1') === (isCleanCb ? 0 : 1));
                    });
                    assert(countInList(prepared.log, 'during2_percent:1') === 1);
                    assert(countInList(prepared.log, 'done2') === 1);

                    classifyMethodByToFrom(method, function (isTo) {
                        if (isTo) {
                            assert(propsDeepContain(prepared.el, {
                                scaleX: 50,
                                scaleY: 90,
                                x: 100,
                                shape: {x: 21, y: 310},
                                style: {opacity: 0.789}
                            }));
                        }
                        else { // isFrom
                            assert(propsDeepContain(prepared.el, {
                                scaleX: record.second.elOldVals.scaleX,
                                scaleY: record.second.elOldVals.scaleY,
                                x: record.first.elOldVals.scaleX,
                                shape: {
                                    x: record.first.elOldVals.shape.x,
                                    y: record.second.elOldVals.shape.y
                                },
                                style: {opacity: record.second.elOldVals.style.opacity}
                            }));
                        }
                    });
                });
            }

            function call2InTheSameFrame(method) {
                var prepared = prepare();
                var record = {};
                return Promise.resolve().then(function () {
                    fistCall(prepared, method, record);
                    secondCallBeforeComplete(prepared, method, record);
                    return subsequentProcess(prepared, method, record);
                });
            }

            function call2InDifferentFrames(method) {
                var prepared = prepare();
                var record = {};
                return Promise.resolve().then(function () {
                    fistCall(prepared, method, record);
                    return promisifiedNextFrame(2)
                }).then(function () {
                    secondCallBeforeComplete(prepared, method, record);
                    return subsequentProcess(prepared, method, record);
                });
            }

            return Promise.resolve()

                .then(function () { return call2InTheSameFrame(elAnimateTo); })
                .then(function () { return call2InTheSameFrame(elAnimateToCleanCb); })
                .then(function () { return call2InTheSameFrame(elAnimateToSetToFinal); })
                .then(function () { return call2InTheSameFrame(elAnimateFrom); })
                .then(function () { return call2InTheSameFrame(elAnimateFromCleanCb); })

                .then(function () { return call2InDifferentFrames(elAnimateTo); })
                .then(function () { return call2InDifferentFrames(elAnimateToCleanCb); })
                .then(function () { return call2InDifferentFrames(elAnimateToSetToFinal); })
                .then(function () { return call2InDifferentFrames(elAnimateFrom); })
                .then(function () { return call2InDifferentFrames(elAnimateFromCleanCb); });
        });

        /**
         * 2 calls to el.animateTo/el.animateFrom.
         * props are the same between the 2 calls.
         */
        addTestCase('2_calls_to_animateTo_animateFrom_prop_same', function () {
            function testSingle(method) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    method(
                        prepared.el,
                        {scaleX: 5, x: 19, shape: {x: 21}},
                        {
                            done: prepared.done1, during: prepared.during1, aborted: prepared.aborted1,
                            duration: DURATION
                        }
                    );

                    assert(prepared.el.animators.length === 2);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                        shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                    };
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);

                    record.first = {elOldVals: elOldVals, existingAnimators: existingAnimators};

                    return promisifiedNextFrame(2);

                }).then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    method(
                        prepared.el,
                        {scaleX: 50, x: 190, shape: {x: 210}},
                        {
                            done: prepared.done2, during: prepared.during2, aborted: prepared.aborted2,
                            duration: DURATION
                        }
                    );

                    assert(prepared.el.animators.length === 2);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                        shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                    };
                    assert(existingAnimators[''] !== record.first.existingAnimators['']);
                    assert(existingAnimators['shape'] !== record.first.existingAnimators['shape']);

                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);
                    assert(countInList(prepared.log, 'during2_percent:1') === 0);
                    assert(countInList(prepared.log, 'done2') === 0);

                    if (method === elAnimateTo || method === elAnimateToCleanCb) {
                        assert(propsDeepContain(prepared.el, elOldVals));
                    }
                    else if (method === elAnimateToSetToFinal
                        || method === elAnimateFrom || method === elAnimateFromCleanCb
                    ) {
                        assert(propsDeepContain(prepared.el, {scaleX: 50, x: 190, shape: {x: 210}}));
                    }
                    else {
                        assert(false);
                    }

                    record.second = {elOldVals: elOldVals, existingAnimators: existingAnimators};

                    return promisifiedNextFrame(2);

                }).then(function () {
                    // Check values changes during animation.
                    assert(!countInList([50, record.first.elOldVals.scaleX, record.second.elOldVals.scaleX], prepared.el.scaleX));
                    assert(!countInList([190, record.first.elOldVals.x, record.second.elOldVals.x], prepared.el.x));
                    assert(!countInList([210, record.first.elOldVals.shape.x, record.second.elOldVals.shape.x], prepared.el.shape.x));

                    return promisifiedTimeOut(DURATION * 1.5, record);

                }).then(function () {
                    // After animation.
                    assert(prepared.el.animators.length === 0);
                    classifyMethodByCleanCb(method, function (isCleanCb) {
                        // done1 and during1 will never occur, since they are aborted.
                        assert(countInList(prepared.log, 'during1_percent:1') === 0);
                        assert(countInList(prepared.log, 'done1') === 0);
                        assert(countInList(prepared.log, 'aborted1') === (isCleanCb ? 0 : 1));
                    });
                    assert(countInList(prepared.log, 'during2_percent:1') === 1);
                    assert(countInList(prepared.log, 'done2') === 1);

                    classifyMethodByToFrom(method, function (isTo) {
                        if (isTo) {
                            assert(propsDeepContain(prepared.el, {scaleX: 50, x: 190, shape: {x: 210}}));
                        }
                        else { // isFrom
                            assert(propsDeepContain(prepared.el, {
                                scaleX: record.second.elOldVals.scaleX,
                                x: record.second.elOldVals.x,
                                shape: {x: record.second.elOldVals.shape.x}
                            }));
                        }
                    });
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo); })
                .then(function () { return testSingle(elAnimateToCleanCb); })
                .then(function () { return testSingle(elAnimateToSetToFinal); })
                .then(function () { return testSingle(elAnimateFrom); })
                .then(function () { return testSingle(elAnimateFromCleanCb); });
        });

        /**
         * 2 calls to el.animateTo/el.animateFrom.
         * No intersection on props between the 2 calls.
         */
        addTestCase('2_calls_to_animateTo_animateFrom_no_intersection', function () {
            function testSingle(method) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    method(
                        prepared.el,
                        {x: 17, y: 18},
                        {
                            done: prepared.done1, during: prepared.during1, aborted: prepared.aborted1,
                            duration: DURATION
                        }
                    );

                    assert(prepared.el.animators.length === 1);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0]
                    };
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);

                    record.first = {elOldVals: elOldVals, existingAnimators: existingAnimators};
                    return promisifiedNextFrame(2);

                }).then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    method(
                        prepared.el,
                        {scaleX: 5, scaleY: 6},
                        {
                            done: prepared.done2, during: prepared.during2, aborted: prepared.aborted2,
                            duration: DURATION
                        }
                    );

                    assert(prepared.el.animators.length === 2);
                    var existingAnimatorsList = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 2)
                    };
                    assert(countInList(existingAnimatorsList[''], record.first.existingAnimators['']) === 1);

                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);
                    assert(countInList(prepared.log, 'during2_percent:1') === 0);
                    assert(countInList(prepared.log, 'done2') === 0);

                    if (method === elAnimateTo || method === elAnimateToCleanCb) {
                        assert(propsDeepContain(prepared.el, elOldVals));
                    }
                    else if (method === elAnimateToSetToFinal
                        || method === elAnimateFrom || method === elAnimateFromCleanCb
                    ) {
                        assert(propsDeepContain(prepared.el, {
                            x: elOldVals.x, y: elOldVals.y, scaleX: 5, scaleY: 6
                        }));
                    }
                    else {
                        assert(false);
                    }

                    record.second = {elOldVals: elOldVals};
                    return promisifiedNextFrame(2);

                }).then(function () {
                    // Check values changes during animation.
                    assert(!countInList([17, record.first.elOldVals.x, record.second.elOldVals.x], prepared.el.x));
                    assert(!countInList([18, record.first.elOldVals.y, record.second.elOldVals.y], prepared.el.y));
                    assert(!countInList([5, record.first.elOldVals.scaleX, record.second.elOldVals.scaleX], prepared.el.scaleX));
                    assert(!countInList([6, record.first.elOldVals.scaleY, record.second.elOldVals.scaleY], prepared.el.scaleY));

                    return promisifiedTimeOut(DURATION * 1.5, record);

                }).then(function (record) {
                    // After animation.
                    assert(prepared.el.animators.length === 0);
                    // None props in call1 are stopped, so done1 can occur, but aborted1 does not occur.
                    classifyMethodByCleanCb(method, function (isCleanCb) {
                        assert(countInList(prepared.log, 'during1_percent:1') === (isCleanCb ? 0 : 1));
                        assert(countInList(prepared.log, 'done1') === (isCleanCb ? 0 : 1));
                    });
                    assert(countInList(prepared.log, 'during2_percent:1') === 1);
                    assert(countInList(prepared.log, 'done2') === 1);

                    classifyMethodByToFrom(method, function (isTo) {
                        if (isTo) {
                            assert(propsDeepContain(prepared.el, {x: 17, y: 18, scaleX: 5, scaleY: 6}));
                        }
                        else { // isFrom
                            assert(propsDeepContain(prepared.el, {
                                x: record.first.elOldVals.x,
                                y: record.first.elOldVals.y,
                                scaleX: record.second.elOldVals.scaleX,
                                scaleY: record.second.elOldVals.scaleY
                            }));
                        }
                    });
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo); })
                .then(function () { return testSingle(elAnimateToCleanCb); })
                .then(function () { return testSingle(elAnimateToSetToFinal); })
                .then(function () { return testSingle(elAnimateFrom); })
                .then(function () { return testSingle(elAnimateFromCleanCb); });
        });

        /**
         * Target values are the same as current values;
         * (Check no animation and callback subtlety) (`cfg.force: false | true`);
         */
        addTestCase('target_values_same_as_current', function () {
            function testSingle(method, cfgForce) {
                var prepared = prepare();

                function checkNoAnimationAndCbCalled() {
                    assert(prepared.el.animators.length === 0);

                    assert(countInList(prepared.log, 'done1') === 1);
                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'aborted1') === 0);
                }

                function checkNoCbCalled() {
                    assert(countInList(prepared.log, 'done1') === 0);
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'aborted1') === 0);
                }

                return Promise.resolve().then(function () {
                    method(
                        prepared.el,
                        {x: INIT_X, y: INIT_Y, style: {opacity: INIT_STYLE_OPACITY}},
                        {
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                            duration: DURATION,
                            force: cfgForce
                        }
                    );

                    if (!cfgForce) {
                        // Immediately call `done` in this JS task (a historical behavior but keep compatible).
                        checkNoAnimationAndCbCalled();
                    }
                    else {
                        // No immediate call to `done` in this JS task if `force: true`.
                        checkNoCbCalled();
                        // Check animations created.
                        assert(prepared.el.animators.length === 2);
                        var existingAnimators = {
                            '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                            'style': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'style', 1)[0]
                        };
                    }

                    assert(propsDeepContain(prepared.el, {x: INIT_X, y: INIT_Y, style: {opacity: INIT_STYLE_OPACITY}}))

                    return promisifiedNextFrame(2);

                }).then(function () {
                    if (!cfgForce) {
                        checkNoAnimationAndCbCalled();
                    }
                    else {
                        // Check animation is not be called before duration.
                        checkNoCbCalled();
                    }

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () {
                    if (!cfgForce) {
                        checkNoAnimationAndCbCalled();
                    }
                    else {
                        checkNoAnimationAndCbCalled();
                    }
                });
            }

            return Promise.resolve()

                .then(function () { return testSingle(elAnimateTo, false); })
                .then(function () { return testSingle(elAnimateToSetToFinal, false); })
                .then(function () { return testSingle(elAnimateFrom, false); })

                .then(function () { return testSingle(elAnimateTo, true); })
                .then(function () { return testSingle(elAnimateToSetToFinal, true); })
                .then(function () { return testSingle(elAnimateFrom, true); });
        });

        /**
         * Test `during`: Test normal cases.
         */
        addTestCase('during_normal_cases', function () {
            function testSingle(method) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    // 1st call
                    method(
                        prepared.el,
                        {scaleX: 2, scaleY: 3, shape: {x: 123}},
                        {
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                            duration: DURATION
                        }
                    );

                    // Check no during call immediately in this JS task.
                    assert(countInList(prepared.log, 'during1') === 0);
                    assert(countInList(prepared.log, 'during1_percent:0') === 0);
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);

                    assert(prepared.el.animators.length === 2);
                    var existingAnimatorsList = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1),
                        'shape': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)
                    };

                    record.first = {existingAnimatorsList: existingAnimatorsList};
                    return promisifiedNextFrame(5);

                }).then(function () {
                    assert(countInList(prepared.log, 'during1') > 4);
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(noDuplicateString(prepared.log, 'during1_percent:'));

                    cleanLog(prepared.log); // clean previous `during1` logs.

                    // 2nd call.
                    method(
                        prepared.el,
                        // All previous animators are discarded.
                        {scaleX: 3, scaleY: 4, shape: {x: 222}},
                        {
                            done: prepared.done2, aborted: prepared.aborted2, during: prepared.during2,
                            duration: DURATION
                        }
                    );

                    assert(prepared.el.animators.length === 2);
                    var existingAnimatorsList = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1),
                        'shape': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)
                    };
                    assert(existingAnimatorsList[''][0] !== record.first.existingAnimatorsList[''][0]);
                    assert(existingAnimatorsList['shape'][0] !== record.first.existingAnimatorsList['shape'][0]);

                    record.second = {existingAnimatorsList: existingAnimatorsList};
                    return promisifiedNextFrame(5);

                }).then(function () {
                    // Should be no more `during1` log, since all previous animators are discarded.
                    assert(countInList(prepared.log, 'during1') === 0);
                    assert(countInList(prepared.log, 'during2') > 4);
                    assert(countInList(prepared.log, 'during2_percent:1') === 0);
                    assert(noDuplicateString(prepared.log, 'during2_percent:'));

                    cleanLog(prepared.log); // clean previous `during1` `during2` logs.

                    // 3rd call.
                    method(
                        prepared.el,
                        // Original `animator[0]` ('shape') should be discarded,
                        // where the original `during` is shift to a next animator.
                        // Original `animator[1]` ('') is retained, since `scaleX` is not included in 2nd call.
                        {scaleY: 9, shape: {x: 333}},
                        {
                            done: prepared.done3, aborted: prepared.aborted3, during: prepared.during3,
                            duration: DURATION
                        }
                    );

                    assert(prepared.el.animators.length === 3);
                    var existingAnimatorsList = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 2),
                        'shape': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)
                    };
                    assert(countInList(existingAnimatorsList[''], record.second.existingAnimatorsList[''][0]));
                    assert(existingAnimatorsList['shape'][0] !== record.second.existingAnimatorsList['shape'][0]);

                    return promisifiedNextFrame(5);

                }).then(function () {
                    assert(countInList(prepared.log, 'during1') === 0);

                    classifyMethodByCleanCb(method, function (isCleanCb) {
                        // New `during2` log should be printed, since some previous animators keep running.
                        if (isCleanCb) {
                            assert(countInList(prepared.log, 'during2') === 0);
                        }
                        else {
                            assert(countInList(prepared.log, 'during2') > 4);
                        }
                    });
                    assert(countInList(prepared.log, 'during3') > 4);
                    assert(countInList(prepared.log, 'during3_percent:1') === 0);
                    assert(noDuplicateString(prepared.log, 'during3_percent:'));

                    return promisifiedTimeOut(DURATION * 3.1);

                }).then(function () {
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    classifyMethodByCleanCb(method, function (isCleanCb) {
                        assert(countInList(prepared.log, 'during2_percent:1') === (isCleanCb ? 0 : 1));
                    });
                    assert(countInList(prepared.log, 'during3_percent:1') === 1);
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo); })
                .then(function () { return testSingle(elAnimateToCleanCb); })
                .then(function () { return testSingle(elAnimateToSetToFinal); })
                .then(function () { return testSingle(elAnimateFrom); })
                .then(function () { return testSingle(elAnimateFromCleanCb); });
        });

        /**
         * Test `during`: Only `during` is used but no animating props (force: true | false).
         */
        addTestCase('during_with_no_animating_props', function () {
            function testSingle(method, cfgForce) {
                var prepared;
                var record = {};

                return Promise.resolve().then(function () {
                    prepared = prepare();
                    prepared.el.x = 0;
                    method(
                        prepared.el,
                        {}, // No animating props
                        {
                            force: cfgForce,
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                            duration: DURATION / 2
                        }
                    );
                    record.checkCfgForceFalse1 = function () {
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(countInList(prepared.log, 'done1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:0') === 0);
                    }
                    if (!cfgForce) {
                        record.checkCfgForceFalse1();
                    }
                    else {
                        assert(countInList(prepared.log, 'during1_percent:1') === 0);
                        assert(countInList(prepared.log, 'done1') === 0);
                        assert(countInList(prepared.log, 'during1_percent:0') === 0);
                    }

                    return promisifiedTimeOut(DURATION / 2 * 1.1);

                }).then(function () {
                    if (!cfgForce) {
                        record.checkCfgForceFalse1();
                    }
                    else {
                        assert(countInList(prepared.log, 'during1') > 4);
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(countInList(prepared.log, 'done1') === 1);
                        assert(noDuplicateString(prepared.log, 'during1_percent:'));
                    }
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo, false); })
                .then(function () { return testSingle(elAnimateFrom, false); })
                .then(function () { return testSingle(elAnimateTo, true); })
                .then(function () { return testSingle(elAnimateFrom, true); });
        });

        /**
         * Test `during`: Only `during` is used but ELEMENT_ANIMATION_PROPS_NONE (force: true | false).
         */
        addTestCase('during_with_ELEMENT_ANIMATION_PROPS_NONE', function () {
            function testSingle(method, cfgForce, changeInnerOrOuterProp) {
                var prepared;
                var record = {};

                function checkFinalValue() {
                    if (method === elAnimateTo) {
                        changeInnerOrOuterProp ? assert(prepared.el.shape.y === 100) : assert(prepared.el.x === 100);
                    }
                    else {
                        changeInnerOrOuterProp ? assert(prepared.el.shape.y === 10) : assert(prepared.el.x === 0);
                    }
                }

                return Promise.resolve().then(function () {
                    prepared = prepare();
                    prepared.el.x = 0;
                    prepared.el.shape.y = 10;
                    method(
                        prepared.el,
                        changeInnerOrOuterProp ? {shape: {y: 100}} : {x: 100},
                        {
                            force: cfgForce,
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1
                        },
                        ELEMENT_ANIMATION_PROPS_NONE
                    );
                    record.checkCfgForceFalse1 = function () {
                        checkFinalValue();
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(countInList(prepared.log, 'done1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:0') === 0);
                    }
                    if (!cfgForce) {
                        record.checkCfgForceFalse1();
                    }
                    else {
                        checkFinalValue();
                        assert(countInList(prepared.log, 'during1_percent:1') === 0);
                        assert(countInList(prepared.log, 'done1') === 0);
                        assert(countInList(prepared.log, 'during1_percent:0') === 0);
                    }

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () {
                    if (!cfgForce) {
                        record.checkCfgForceFalse1();
                    }
                    else {
                        // Test `during` is called only once, and `percent:1` is passed.
                        assert(countInList(prepared.log, 'during1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:0') === 0);
                        assert(countInList(prepared.log, 'done1') === 1);
                    }
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo, false, true); })
                .then(function () { return testSingle(elAnimateFrom, false, true); })
                .then(function () { return testSingle(elAnimateTo, false, false); })
                .then(function () { return testSingle(elAnimateFrom, false, false); })
                .then(function () { return testSingle(elAnimateTo, true, true); })
                .then(function () { return testSingle(elAnimateFrom, true, true); })
                .then(function () { return testSingle(elAnimateTo, true, false); })
                .then(function () { return testSingle(elAnimateFrom, true, false); });
        });

        /**
         * Test stop via `el.animateTo`/`el.animateFrom`
         * (Originally no animation) (`force: false | true`)
         */
        addTestCase('stop_via_animateTo_animateFrom_originally_no_animation', function () {
            function testSingle(method, cfgForce) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    // Stop when no previous animation.
                    method(
                        prepared.el,
                        {x: 150, y: 123, style: {opacity: 0.567}},
                        {
                            done: prepared.done1, during: prepared.during1, aborted: prepared.aborted1,
                            duration: DURATION
                        },
                        ELEMENT_ANIMATION_PROPS_NONE
                    );

                    assert(prepared.el.animators.length === 0);
                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'done1') === 1);
                    assert(countInList(prepared.log, 'aborted1') === 0);

                    function checkValues() {
                        classifyMethodByToFrom(method, function (isTo) {
                            if (isTo) {
                                assert(propsDeepContain(prepared.el, {
                                    x: 150, y: 123, style: {opacity: 0.567},
                                    // The following props are not changed.
                                    scaleX: elOldVals.scaleX, shape: {width: elOldVals.shape.width}
                                }));
                            }
                            else { // isFrom
                                assert(propsDeepContain(prepared.el, elOldVals));
                            }
                        });
                    }
                    checkValues();

                    record.first = {checkValues: checkValues};
                    return promisifiedTimeOut(DURATION / 2);

                }).then(function () {
                    // Ensure no animation change the values.
                    record.first.checkValues();

                    var elOldVals = retrieveElCurrValues(prepared.el);
                    method(
                        prepared.el,
                        {x: 550, scaleX: 13, style: {opacity: 0.789}},
                        {
                            done: prepared.done2, aborted: prepared.aborted2, during: prepared.during2,
                            force: cfgForce
                            // duration can be not provided - by default 0 if animationProps is ELEMENT_ANIMATION_PROPS_NONE.
                        },
                        ELEMENT_ANIMATION_PROPS_NONE
                    );

                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'done1') === 1);
                    assert(countInList(prepared.log, 'aborted1') === 0);
                    if (!cfgForce) {
                        // Should have no animation and callbacks have been called.
                        assert(prepared.el.animators.length === 0);
                        assert(countInList(prepared.log, 'during2_percent:1') === 1);
                        assert(countInList(prepared.log, 'done2') === 1);
                        assert(countInList(prepared.log, 'aborted2') === 0);
                    }
                    else {
                        // Should have one animate for callbacks when force: true
                        assert(prepared.el.animators.length === 1);
                        assert(countInList(prepared.log, 'during2_percent:1') === 0);
                        assert(countInList(prepared.log, 'done2') === 0);
                        assert(countInList(prepared.log, 'aborted2') === 0);
                    }

                    function checkValues() {
                        classifyMethodByToFrom(method, function (isTo) {
                            if (isTo) {
                                assert(propsDeepContain(prepared.el, {
                                    x: 550, scaleX: 13, style: {opacity: 0.789},
                                    // The following props are not changed.
                                    y: elOldVals.y, shape: {width: elOldVals.shape.width}
                                }));
                            }
                            else { // isFrom
                                assert(propsDeepContain(prepared.el, elOldVals));
                            }
                        });
                    }

                    record.second = {checkValues: checkValues};

                    return promisifiedNextFrame(2);

                }).then(function () {
                    assert(prepared.el.animators.length === 0);
                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'done1') === 1);
                    assert(countInList(prepared.log, 'aborted1') === 0);
                    assert(countInList(prepared.log, 'during2_percent:1') === 1);
                    assert(countInList(prepared.log, 'done2') === 1);
                    assert(countInList(prepared.log, 'aborted2') === 0);

                    // Ensure no animation change the values.
                    record.second.checkValues();
                });
            }

            return Promise.resolve()

                .then(function () { return testSingle(elAnimateTo, false); })
                .then(function () { return testSingle(elAnimateToCleanCb, false); })
                .then(function () { return testSingle(elAnimateToSetToFinal, false); })
                .then(function () { return testSingle(elAnimateFrom, false); })
                .then(function () { return testSingle(elAnimateFromCleanCb, false); })

                .then(function () { return testSingle(elAnimateTo, true); })
                .then(function () { return testSingle(elAnimateToCleanCb, true); })
                .then(function () { return testSingle(elAnimateToSetToFinal, true); })
                .then(function () { return testSingle(elAnimateFrom, true); })
                .then(function () { return testSingle(elAnimateFromCleanCb, true); });
        });

        /**
         * Test stop via `el.animateTo`/`el.animateFrom`
         * (Originally has animation; test ALL animation should be stopped) (`force: false | true`)
         */
        addTestCase('stop_via_animateTo_animateFrom_originally_has_animation_all_stop', function () {
            function testSingle(method, cfgForce) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    // Start animations
                    method(
                        prepared.el,
                        {x: 150, y: 123, shape: {x: 55, y: 66}, style: {opacity: 0.567}},
                        {
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                            duration: DURATION
                        }
                    );
                    assert(prepared.el.animators.length === 3);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                        'shape': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0],
                        'style': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'style', 1)[0]
                    };

                    record.first = {existingAnimators: existingAnimators};

                    return promisifiedTimeOut(DURATION / 2);

                }).then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    // Stop animations
                    var targetProps = {x: -5, y: -10, shape: {x: 155, y: 166}, style: {opacity: 0.789}};
                    method(
                        prepared.el,
                        targetProps,
                        {
                            done: prepared.done2, aborted: prepared.aborted2, during: prepared.during2,
                            force: cfgForce
                            // duration can be not provided - by default 0 if animationProps is ELEMENT_ANIMATION_PROPS_NONE.
                        },
                        ELEMENT_ANIMATION_PROPS_NONE
                    );

                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);
                    if (method === elAnimateTo || method === elAnimateToSetToFinal || method === elAnimateFrom) {
                        assert(countInList(prepared.log, 'aborted1') === 1);
                    }
                    if (!cfgForce) {
                        assert(prepared.el.animators.length === 0);
                        assert(countInList(prepared.log, 'during2_percent:1') === 1);
                        assert(countInList(prepared.log, 'done2') === 1);
                        assert(countInList(prepared.log, 'aborted2') === 0);
                    }
                    else {
                        // Should have one animate for callbacks when force: true
                        assert(prepared.el.animators.length === 1);
                        assert(
                            !countInList([
                                record.first.existingAnimators[''],
                                record.first.existingAnimators['style'],
                                record.first.existingAnimators['shape']
                            ], prepared.el.animators[0]) // A new animator is created for `force: true`.
                        );
                        assert(countInList(prepared.log, 'during2_percent:1') === 0);
                        assert(countInList(prepared.log, 'done2') === 0);
                        assert(countInList(prepared.log, 'aborted2') === 0);
                    }

                    function checkValues() {
                        classifyMethodByToFrom(method, function (isTo) {
                            if (isTo) {
                                assert(propsDeepContain(prepared.el, {x: -5, y: -10, shape: {x: 155, y: 166}, style: {opacity: 0.789}}));
                            }
                            else { // isFrom
                                assert(propsDeepContain(prepared.el, elOldVals));
                            }
                        });
                    }
                    checkValues();

                    record.second = {checkValues: checkValues};
                    return promisifiedNextFrame(2);

                }).then(function () {
                    record.second.checkValues();

                    function checkFinalCbAndAnimators() {
                        assert(countInList(prepared.log, 'during1_percent:1') === 0);
                        assert(countInList(prepared.log, 'done1') === 0);
                        if (method === elAnimateTo || method === elAnimateToSetToFinal || method === elAnimateFrom) {
                            assert(countInList(prepared.log, 'aborted1') === 1);
                        }
                        if (!cfgForce) {
                            assert(prepared.el.animators.length === 0);
                            assert(countInList(prepared.log, 'during2_percent:1') === 1);
                            assert(countInList(prepared.log, 'done2') === 1);
                            assert(countInList(prepared.log, 'aborted2') === 0);
                        }
                        else {
                            // force: true created animator should have been completed.
                            assert(prepared.el.animators.length === 0);
                            assert(countInList(prepared.log, 'during2_percent:1') === 1);
                            assert(countInList(prepared.log, 'done2') === 1);
                            assert(countInList(prepared.log, 'aborted2') === 0);
                        }
                    }
                    checkFinalCbAndAnimators();

                    record.second2 = {checkFinalCbAndAnimators: checkFinalCbAndAnimators};

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () {
                    // Ensure no animations.
                    record.second.checkValues();
                    record.second2.checkFinalCbAndAnimators();
                });
            }

            return Promise.resolve()

                .then(function () { return testSingle(elAnimateTo, false); })
                .then(function () { return testSingle(elAnimateToCleanCb, false); })
                .then(function () { return testSingle(elAnimateToSetToFinal, false); })
                .then(function () { return testSingle(elAnimateFrom, false); })
                .then(function () { return testSingle(elAnimateFromCleanCb, false); })

                .then(function () { return testSingle(elAnimateTo, true); })
                .then(function () { return testSingle(elAnimateToCleanCb, true); })
                .then(function () { return testSingle(elAnimateToSetToFinal, true); })
                .then(function () { return testSingle(elAnimateFrom, true); })
                .then(function () { return testSingle(elAnimateFromCleanCb, true); });
        });

        /**
         * Test stop via `el.animateTo`/`el.animateFrom`
         * (Originally has animation; test only PART OF animations are stopped) (`force: false | true`)
         */
        addTestCase('stop_via_animateTo_animateFrom_originally_has_animation_part_stop', function () {
            function testSingle(method, cfgForce) {
                var prepared = prepare();
                var record = {};

                function checkAnimatorsComplete_Yes_call1() {
                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'done1') === 1);
                    assert(countInList(prepared.log, 'aborted1') === 0);
                }
                function checkAnimatorsComplete_No_call1() {
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);
                    assert(countInList(prepared.log, 'aborted1') === 0);
                }
                function checkAnimatorsComplete_Yes_call2() {
                    assert(countInList(prepared.log, 'during2_percent:1') === 1);
                    assert(countInList(prepared.log, 'done2') === 1);
                    assert(countInList(prepared.log, 'aborted2') === 0);
                }
                function checkAnimatorsComplete_No_call2() {
                    assert(countInList(prepared.log, 'during2_percent:1') === 0);
                    assert(countInList(prepared.log, 'done2') === 0);
                    assert(countInList(prepared.log, 'aborted2') === 0);
                }

                return Promise.resolve().then(function () {
                    // Start animations with `el.animateTo`.
                    var targetProps = {x: 55, y: 23, style: {opacity: 0.345}, shape: {y: 78, width: 56}};
                    elAnimateTo(
                        prepared.el,
                        targetProps,
                        {
                            done: prepared.done1, during: prepared.during1, aborted: prepared.aborted1,
                            duration: DURATION
                        }
                    );
                    assert(prepared.el.animators.length === 3);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                        style: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'style', 1)[0],
                        shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                    };

                    record.first = {existingAnimators: existingAnimators, targetProps: {x: 55, y: 23, style: {opacity: 0.345}, shape: {y: 78, width: 56}}};
                    return promisifiedTimeOut(DURATION / 3);

                }).then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    // Stop animations
                    method(
                        prepared.el,
                        // Test both 1st-level and 2nd-level props. Part of props are updated.
                        {x: 155, style: {opacity: 0.789}, shape: {y: 178}},
                        {
                            done: prepared.done2, during: prepared.during2, aborted: prepared.aborted2,
                            force: cfgForce
                            // duration can be not provided - by default 0 if animationProps is ELEMENT_ANIMATION_PROPS_NONE.
                        },
                        ELEMENT_ANIMATION_PROPS_NONE
                    );

                    function checkAnimatorsRemain(haveForceDedicatedAnimator) {
                        // Some animators created by the first `el.animateTo`/`el.animateFrom` remain.
                        assert(prepared.el.animators.length === (haveForceDedicatedAnimator ? 3 : 2));
                        // The dedicated animator may be on '' or 'shape' or 'style'.
                        var existingAnimatorsList = {
                            '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1, haveForceDedicatedAnimator ? '>=' : '==='),
                            shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1, haveForceDedicatedAnimator ? '>=' : '===')
                        };
                        assert(countInList(existingAnimatorsList[''], record.first.existingAnimators['']) === 1);
                        assert(countInList(existingAnimatorsList['shape'], record.first.existingAnimators['shape']) === 1);
                    }

                    if (!cfgForce) {
                        checkAnimatorsRemain(false);
                        checkAnimatorsComplete_No_call1();
                        checkAnimatorsComplete_Yes_call2();
                    }
                    else {
                        checkAnimatorsRemain(true);
                        checkAnimatorsComplete_No_call1();
                        checkAnimatorsComplete_No_call2();
                    }

                    var propsRemaining = {y: elOldVals.y, shape: {width: elOldVals.shape.width}};
                    var propsStopped;
                    classifyMethodByToFrom(method, function (isTo) {
                        if (isTo) {
                            propsStopped = {x: 155, style: {opacity: 0.789}, shape: {y: 178}};
                        }
                        else { // isFrom
                            propsStopped = {x: elOldVals.x, style: {opacity: elOldVals.style.opacity}, shape: {y: elOldVals.shape.y}};
                        }
                    });
                    assert(propsDeepContain(prepared.el, propsStopped));
                    assert(propsDeepContain(prepared.el, propsRemaining));

                    record.second = {
                        checkAnimatorsRemain: checkAnimatorsRemain,
                        propsStopped: propsStopped
                    };

                    return promisifiedNextFrame(2);

                }).then(function () {
                    record.second.checkAnimatorsRemain(false);
                    checkAnimatorsComplete_No_call1();
                    checkAnimatorsComplete_Yes_call2();

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () {
                    assert(prepared.el.animators.length === 0);
                    if (method === elAnimateTo || method === elAnimateToSetToFinal || method === elAnimateFrom) {
                        checkAnimatorsComplete_Yes_call1();
                    }
                    checkAnimatorsComplete_Yes_call2();

                    // Check animations created by 1st `el.animateTo` have reached the target values,
                    // and animations stopped by 2nd call remain unchanged on their values.
                    assert(propsDeepContain(prepared.el, record.second.propsStopped));
                    assert(propsDeepContain(prepared.el, {
                        y: record.first.targetProps.y, shape: {width: record.first.targetProps.shape.width}
                    }));
                });
            }

            return Promise.resolve()

                .then(function () { return testSingle(elAnimateTo, false); })
                .then(function () { return testSingle(elAnimateToCleanCb, false); })
                .then(function () { return testSingle(elAnimateToSetToFinal, false); })
                .then(function () { return testSingle(elAnimateFrom, false); })
                .then(function () { return testSingle(elAnimateFromCleanCb, false); })

                .then(function () { return testSingle(elAnimateTo, true); })
                .then(function () { return testSingle(elAnimateToCleanCb, true); })
                .then(function () { return testSingle(elAnimateToSetToFinal, true); })
                .then(function () { return testSingle(elAnimateFrom, true); })
                .then(function () { return testSingle(elAnimateFromCleanCb, true); });
        });

        /**
         * Test `animationProps` normal cases.
         */
        addTestCase('animationProps_normal_cases', function () {
            function testSingle(method) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    method(
                        prepared.el,
                        // Test both 1st-level and 2nd-level props.
                        {x: 101, y: 123, style: {opacity: 1}, shape: {y: 156, height: 567}},
                        {
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                            duration: DURATION
                        },
                        // only `y` and `shape.height` should animate.
                        // Notice: `style` is not specified here, should not animate.
                        {y: true, shape: {height: true}}
                    );

                    assert(prepared.el.animators.length === 2);
                    var existingAnimators = {
                        '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                        shape: findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                    };

                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);

                    if (method === elAnimateTo || method === elAnimateToCleanCb) {
                        assert(propsDeepContain(prepared.el, {x: 101, style: {opacity: 1}, shape: {y: 156}}));
                        assert(propsDeepContain(prepared.el, {y: elOldVals.y, shape: {height: elOldVals.shape.height}}));
                    }
                    else if (method === elAnimateToSetToFinal) {
                        assert(propsDeepContain(prepared.el, {x: 101, y: 123, style: {opacity: 1}, shape: {y: 156, height: 567}}));
                    }
                    else if (method === elAnimateFrom || method === elAnimateFromCleanCb) {
                        assert(propsDeepContain(prepared.el, {y: 123, shape: {height: 567}}));
                        assert(propsDeepContain(prepared.el, {x: elOldVals.x, style: {opacity: elOldVals.style.opacity}, shape: {y: elOldVals.shape.y}}));
                    }
                    assert(propsDeepContain(prepared.el, {scaleX: elOldVals.scaleX}));

                    record.first = {elOldVals: elOldVals};
                    return promisifiedNextFrame(2);

                }).then(function () {
                    // Check values during animation.
                    assert(!countInList([record.first.elOldVals.y, 123], prepared.el.y));
                    assert(!countInList([record.first.elOldVals.shape.height, 567], prepared.el.shape.height));

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () {
                    // After animation completes.
                    assert(prepared.el.animators.length === 0);

                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'done1') === 1);

                    classifyMethodByToFrom(method, function (isTo) {
                        if (isTo) {
                            assert(propsDeepContain(prepared.el, {x: 101, y: 123, style: {opacity: 1}, shape: {y: 156, height: 567}}));
                        }
                        else { // isFrom
                            assert(propsDeepContain(prepared.el, record.first.elOldVals));
                        }
                    });
                    assert(propsDeepContain(prepared.el, {scaleX: record.first.elOldVals.scaleX}));
                });
            }
            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo); })
                .then(function () { return testSingle(elAnimateToCleanCb); })
                .then(function () { return testSingle(elAnimateToSetToFinal); })
                .then(function () { return testSingle(elAnimateFrom); })
                .then(function () { return testSingle(elAnimateFromCleanCb); });
        });

        /**
         * Test `duration: 0`.
         */
        addTestCase('duration_0', function () {
            function testSingle(method, beginWithAnimation) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    if (beginWithAnimation) {
                        // Start an animation first.
                        method(
                            prepared.el,
                            {x: 55, shape: {width: 111}},
                            {
                                done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                                duration: DURATION
                            }
                        );
                    }

                    record.first = {elOldVals: elOldVals};
                    return promisifiedTimeOut(DURATION / 4);

                }).then(function () {
                    assert(countInList(prepared.log, 'done1') === 0);
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);

                    var elOldVals = retrieveElCurrValues(prepared.el);

                    // Call with `duration: 0`
                    var cfg = {
                        done: prepared.done2, aborted: prepared.aborted2, during: prepared.during2,
                        duration: 0
                    };
                    method(
                        prepared.el,
                        {x: 155, shape: {width: 211}},
                        cfg
                    );

                    checkValuesNotChange();

                    function checkValuesNotChange() {
                        assert(countInList(prepared.log, 'done2') === 0);
                        assert(countInList(prepared.log, 'during2_percent:1') === 0);

                        if (method === elAnimateTo || method === elAnimateToCleanCb) {
                            // Check that values are not changed in this frame. They should be changed in the next frame.
                            assert(propsDeepContain(prepared.el, elOldVals));
                        }
                        else if (method === elAnimateToSetToFinal || method === elAnimateFrom || method === elAnimateFromCleanCb) {
                            assert(propsDeepContain(prepared.el, {x: 155, shape: {width: 211}}));
                        }
                        else {
                            assert(false);
                        }
                    }

                    function checkValuesChanged() {
                        if (beginWithAnimation) {
                            // done1 will never occur, since it has been discarded.
                            assert(countInList(prepared.log, 'done1') === 0);
                            assert(countInList(prepared.log, 'during1_percent:1') === 0);
                            classifyMethodByCleanCb(method, function (isCleanCb) {
                                assert(countInList(prepared.log, 'aborted1') === (isCleanCb ? 0 : 1));
                            });
                        }
                        assert(countInList(prepared.log, 'done2') === 1);
                        assert(countInList(prepared.log, 'during2_percent:1') === 1);

                        classifyMethodByToFrom(method, function (isTo) {
                            if (isTo) {
                                assert(propsDeepContain(prepared.el, {x: 155, shape: {width: 211}}));
                            }
                            else { // isFrom
                                assert(propsDeepContain(prepared.el, elOldVals));
                            }
                        });
                    }

                    record.second = {
                        checkValuesNotChange: checkValuesNotChange,
                        checkValuesChanged: checkValuesChanged
                    };

                    return promisifiedZRRenderedInFutherFrame(zr);

                }).then(function () {
                    // Check that values are changed in this frame.
                    record.second.checkValuesChanged();

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () {
                    // Ensure no animation change the values.
                    record.second.checkValuesChanged();
                });
            }

            return Promise.resolve()

                .then(function () { return testSingle(elAnimateTo, false); })
                .then(function () { return testSingle(elAnimateToCleanCb, false); })
                .then(function () { return testSingle(elAnimateToSetToFinal, false); })
                .then(function () { return testSingle(elAnimateFrom, false); })
                .then(function () { return testSingle(elAnimateFromCleanCb, false); })

                .then(function () { return testSingle(elAnimateTo, true); })
                .then(function () { return testSingle(elAnimateToCleanCb, true); })
                .then(function () { return testSingle(elAnimateToSetToFinal, true); })
                .then(function () { return testSingle(elAnimateFrom, true); })
                .then(function () { return testSingle(elAnimateFromCleanCb, true); })
        });

        /**
         * Test `duration: 0, delay > 0`.
         */
        addTestCase('duration_0_delay', function () {
            function testSingle() {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    // Call with `duration: 0, delay > 0`
                    var cfg = {
                        done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                        duration: 0, delay: DURATION / 2
                    };
                    elAnimateTo(
                        prepared.el,
                        {x: 155, shape: {width: 211}},
                        cfg
                    );

                    checkValuesNotChange();

                    function checkValuesNotChange() {
                        assert(countInList(prepared.log, 'done1') === 0);
                        assert(countInList(prepared.log, 'during1_percent:1') === 0);

                        assert(propsDeepContain(prepared.el, elOldVals));
                    }

                    function checkValuesChanged() {
                        assert(countInList(prepared.log, 'done1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(propsDeepContain(prepared.el, {x: 155, shape: {width: 211}}));
                    }

                    record.first = {
                        checkValuesNotChange: checkValuesNotChange,
                        checkValuesChanged: checkValuesChanged
                    };

                    return promisifiedZRRenderedInFutherFrame(zr);

                }).then(function () {
                    record.first.checkValuesNotChange();

                    return promisifiedTimeOut(DURATION / 2 * 1.1);

                }).then(function () {
                    record.first.checkValuesChanged();
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(); });
        });

        /**
         * Switch between null/undefined and animatable value.
         */
        addTestCase('switch_null_undefined_animatable_value', function () {
            function testSingle() {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    var targetPoints = [[111, 5], [222, 7], [333, 9]];
                    var targetPointsStr = JSON.stringify(targetPoints);
                    elAnimateTo(
                        prepared.el,
                        // Previous `__myPts` is undefined.
                        {shape: {__myPts: targetPoints}},
                        {
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                            duration: DURATION
                        }
                    );

                    // Expect assign directly without animation.
                    function check() {
                        assert(prepared.el.animators.length === 0);
                        assert(countInList(prepared.log, 'done1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(JSON.stringify(prepared.el.shape.__myPts) === targetPointsStr);
                    }
                    check();

                    record.first = {check: check, targetPointsStr: targetPointsStr};
                    return promisifiedTimeOut(DURATION / 2);

                }).then(function () {
                    // Check no animation change the result.
                    record.first.check();

                    var elOldVals = retrieveElCurrValues(prepared.el);

                    // Start animations on `__myPts`.
                    var targetPoints = [[151, 53], [252, 73], [353, 93]];
                    var targetPointsStr = JSON.stringify(targetPoints);
                    elAnimateTo(
                        prepared.el,
                        {shape: {__myPts: targetPoints}},
                        {
                            done: prepared.done2, aborted: prepared.aborted2, during: prepared.during2,
                            duration: DURATION
                        }
                    );

                    function check() {
                        assert(prepared.el.animators.length === 1);
                        assert(countInList(prepared.log, 'done2') === 0);
                        assert(countInList(prepared.log, 'during2_percent:1') === 0);
                    }
                    check();
                    assert(propsDeepContain(prepared.el, elOldVals));

                    record.second = {check: check, targetPointsStr: targetPointsStr};
                    return promisifiedTimeOut(DURATION / 2);

                }).then(function () {
                    record.second.check();
                    // Check values during animation.
                    var currPointsStr = JSON.stringify(prepared.el.shape.__myPts);
                    assert(!countInList(
                        [record.first.targetPointsStr, record.second.targetPointsStr],
                        currPointsStr
                    ));
                    assert(countInList(prepared.log, 'during2') > 0);

                    // Set to null and stop animation.
                    elAnimateTo(
                        prepared.el,
                        {shape: {__myPts: null}},
                        {
                            done: prepared.done3, aborted: prepared.aborted3, during: prepared.during3,
                            duration: DURATION / 2
                        }
                    );

                    assert(prepared.el.animators.length === 0);
                    assert(countInList(prepared.log, 'done2') === 0);
                    assert(countInList(prepared.log, 'during2_percent:1') === 0);
                    assert(countInList(prepared.log, 'done3') === 1);
                    assert(countInList(prepared.log, 'during3_percent:1') === 1);
                    assert(prepared.el.shape.__myPts == null);
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(); });
        });

        /**
         * Test edge case: `props` is empty or contains non-existing prop keys.
         */
        addTestCase('edge_case_props_empty_or_contains_non_existing_prop_keys', function () {
            function testSingle(method, emptyProps, explicitlyChangeAnimatingProps) {
                var prepared = prepare();
                var record = {};

                return Promise.resolve().then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    // Call with no previous animation.
                    method(
                        prepared.el,
                        emptyProps,
                        {
                            done: prepared.done1, aborted: prepared.aborted1, during: prepared.during1,
                            duration: DURATION
                        }
                    );

                    function checkNothingHappen() {
                        assert(prepared.el.animators.length === 0);
                        assert(countInList(prepared.log, 'done1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(propsDeepContain(prepared.el, elOldVals));
                    }
                    checkNothingHappen();

                    record.first = {checkNothingHappen: checkNothingHappen};
                    return promisifiedTimeOut(DURATION / 2);

                }).then(function () {
                    record.first.checkNothingHappen();

                    // Start animations
                    prepared.el.shape.__myPts = [[111, 9], [211, 8]];
                    method(
                        prepared.el,
                        {x: 100, shape: {__myPts: [[151, 97], [251, 87]]}},
                        {
                            done: prepared.done2, aborted: prepared.aborted2, during: prepared.during2,
                            duration: DURATION
                        }
                    );

                    function checkNothingHappen() {
                        assert(prepared.el.animators.length === 2);
                        var existingAnimators = {
                            '': findAnimatorByTargetNameCheckCount(prepared.el.animators, '', 1)[0],
                            'shape': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                        };
                        assert(countInList(prepared.log, 'done1') === 1);
                        assert(countInList(prepared.log, 'during1_percent:1') === 1);
                        assert(countInList(prepared.log, 'done2') === 0);
                        assert(countInList(prepared.log, 'during2_percent:1') === 0);
                    }
                    checkNothingHappen();

                    record.second = {checkNothingHappen: checkNothingHappen};
                    return promisifiedNextFrame(2);

                }).then(function () {
                    var elOldVals = retrieveElCurrValues(prepared.el);

                    if (explicitlyChangeAnimatingProps) {
                        prepared.el.setShape('__myPts', null);
                    }

                    // Call with previous animation.
                    method(
                        prepared.el,
                        emptyProps,
                        {
                            done: prepared.done3, aborted: prepared.aborted3, during: prepared.during3,
                            duration: DURATION
                        }
                    );

                    function checkNothingHappen() {
                        record.second.checkNothingHappen();
                        assert(countInList(prepared.log, 'done3') === 1);
                        assert(countInList(prepared.log, 'during3_percent:1') === 1);
                    }
                    checkNothingHappen();
                    assert(propsDeepContain(prepared.el, elOldVals));

                    record.third = {checkNothingHappen: checkNothingHappen};
                    return promisifiedNextFrame(2);

                }).then(function () {
                    record.third.checkNothingHappen();

                    return promisifiedTimeOut(DURATION * 1.1);

                }).then(function () {
                    assert(prepared.el.animators.length === 0);
                    assert(countInList(prepared.log, 'done1') === 1);
                    assert(countInList(prepared.log, 'during1_percent:1') === 1);
                    assert(countInList(prepared.log, 'done2') === 1);
                    assert(countInList(prepared.log, 'during2_percent:1') === 1);
                    assert(countInList(prepared.log, 'done3') === 1);
                    assert(countInList(prepared.log, 'during3_percent:1') === 1);
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo, null, false); })
                .then(function () { return testSingle(elAnimateFrom, null, false); })
                .then(function () { return testSingle(elAnimateTo, null, true); })
                .then(function () { return testSingle(elAnimateFrom, null, true); })
                .then(function () { return testSingle(elAnimateTo, {}, false); })
                .then(function () { return testSingle(elAnimateFrom, {}, false); })
                .then(function () { return testSingle(elAnimateTo, {nonExistingProp1: []}, false); })
                .then(function () { return testSingle(elAnimateFrom, {nonExistingProp1: []}, false); })
                .then(function () { return testSingle(elAnimateTo, {shape: {nonExistingProp2: []}}, false); })
                .then(function () { return testSingle(elAnimateFrom, {shape: {nonExistingProp2: []}}, false); });
        });

        /**
         * Test animating points can be externally used.
         * @see ZR_ELEMENT_ANIMATE_PROP_OBJECT_REFERENCE_CHANGE
         */
        addTestCase('animating_points_externally_used', function () {
            function testSingle(method) {
                var prepared;
                var animatingPoints;

                function prepareForThisTest() {
                    prepared = prepare();
                    prepared.el.setShape({points: [[111, 2], [211, 5], [311, 7]]});
                }
                function retrieveAnimatingPoints() {
                    animatingPoints = prepared.el.shape.points;
                }
                function checkTheSame() {
                    // object is not changed, can be reusable.
                    assert(animatingPoints === prepared.el.shape.points);
                }
                function checkAnimation(hasAnimation) {
                    assert(arguments.length === 1);
                    if (hasAnimation) {
                        assert(prepared.el.animators.length === 1);
                        var existingAnimators = {
                            'shape': findAnimatorByTargetNameCheckCount(prepared.el.animators, 'shape', 1)[0]
                        };
                    }
                    else {
                        assert(prepared.el.animators.length === 0);
                    }
                }

                return Promise.resolve().then(function () {
                    prepareForThisTest();
                    method( // Expect no animation is create
                        prepared.el,
                        {shape: {points: [[151, 27], [251, 57], [351, 77]]}},
                        {duration: DURATION / 2},
                        ELEMENT_ANIMATION_PROPS_NONE
                    );
                    retrieveAnimatingPoints();

                    checkAnimation(false);
                    checkTheSame();
                    return promisifiedNextFrame(3);

                }).then(function () {
                    checkTheSame();

                    return promisifiedTimeOut(DURATION / 2 * 1.1);

                }).then(function () {
                    checkTheSame();

                    prepareForThisTest();
                    method( // Animate to the same values.
                        prepared.el,
                        {shape: {points: [[111, 2], [211, 5], [311, 7]]}},
                        {duration: DURATION / 2},
                        ELEMENT_ANIMATION_PROPS_NONE
                    );
                    retrieveAnimatingPoints();

                    // checkAnimation(false);
                    checkTheSame();
                    return promisifiedNextFrame(3);

                }).then(function () {
                    checkTheSame();

                    return promisifiedTimeOut(DURATION / 2 * 1.1);

                }).then(function () {
                    checkTheSame();

                    prepareForThisTest();
                    method( // Animate to the different values.
                        prepared.el,
                        {shape: {points: [[151, 27], [251, 57], [351, 77]]}},
                        {duration: DURATION / 2}
                    );
                    retrieveAnimatingPoints();

                    checkAnimation(true);
                    checkTheSame();

                    return promisifiedNextFrame(3);

                }).then(function () {
                    checkTheSame();

                    return promisifiedTimeOut(DURATION / 2 * 1.1);

                }).then(function () {
                    checkTheSame();
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo); })
                .then(function () { return testSingle(elAnimateToSetToFinal); })
                .then(function () { return testSingle(elAnimateFrom); });
        });

        /**
         * Create a infinite animation by `duration: Infinity`.
         */
        addTestCase('infinite_animation_by_duration_infinity', function () {
            function testSingle(method) {
                var prepared;
                var animatingPoints;
                var shouldFail = false;

                return Promise.resolve().then(function () {
                    prepared = prepare();
                    prepared.el.x = 0;
                    method( // Create an infinite animation.
                        prepared.el,
                        {x: 1},
                        {
                            done: prepared.done1, aborted: prepared.aborted1,
                            during: function (percent) {
                                if (percent !== 0) {
                                    shouldFail = true;
                                }
                                prepared.during1(percent);
                            },
                            duration: Infinity
                        }
                    );

                    return promisifiedTimeOut(DURATION / 2);

                }).then(function () {
                    assert(!shouldFail);
                    assert(countInList(prepared.log, 'during1_percent:1') === 0);
                    assert(countInList(prepared.log, 'done1') === 0);
                    assert(countInList(prepared.log, 'during1_percent:0') > 1);

                    cleanLog(prepared.log); // clean previous logs.

                    method( // Stop the infinite animation.
                        prepared.el,
                        {x: 1},
                        {
                            done: prepared.done2, aborted: prepared.aborted2,
                            during: prepared.during2,
                        },
                        ELEMENT_ANIMATION_PROPS_NONE
                    );
                    assert(countInList(prepared.log, 'during2_percent:1') === 1);
                    assert(countInList(prepared.log, 'done2') === 1);

                    cleanLog(prepared.log); // clean previous logs.

                    return promisifiedTimeOut(DURATION / 2);

                }).then(function () {
                    assert(!shouldFail);
                    assert(prepared.log.length === 0);
                });
            }

            return Promise.resolve()
                .then(function () { return testSingle(elAnimateTo); })
                .then(function () { return testSingle(elAnimateFrom); });
        });


        return {
            beforeAll: beforeAll,
            afterAll: afterAll,
            cases: wrapCases(),
        };

    } // End of `createTestCases`.


    return {
        runStandalone: runStandalone,
        createTestSuite: createTestSuite
    };
}));
