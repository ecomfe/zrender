import * as ns from '../zrender';
import { createZr } from '../utHelper';
// @ts-ignore
import zrAnimationAPITest from '../../../animation-api-cases.js';

describe('zr_element_animation_api', function () {

    const TIME_OUT = 60 * 60 * 1000; // A large value to disable time-out.

    function consoleLog() {
        // @ts-ignore
        // console.log.apply(console, arguments);
    }
    const testSuite = zrAnimationAPITest.createTestSuite(ns, consoleLog);

    let zr: ns.ZRenderType;
    beforeAll(function () {
        zr = createZr();
        testSuite.beforeAll(zr);
    });

    afterAll(function () {
        testSuite.afterAll();
        zr.dispose();
    });

    for (let caseIdx = 0; caseIdx < testSuite.cases.length; caseIdx++) {
        // Test detailed Element animation APIs.
        it('zr_element_animation_api_' + caseIdx, () => {
            return testSuite.cases[caseIdx]();
        }, TIME_OUT);
    }

});
