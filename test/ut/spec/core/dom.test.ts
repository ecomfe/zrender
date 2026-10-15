/**
 * @jest-environment jsdom
 */
import { transformCoordWithViewport } from '../../../../src/core/dom';

describe('dom', function () {

    const WIDTH = 100;
    const HEIGHT = 80;
    const ELEMENT_LEFT = 10;
    const ELEMENT_TOP = 200;
    let scrollY = 0;

    const proto = HTMLElement.prototype;
    const oldOffsetLeft = Object.getOwnPropertyDescriptor(proto, 'offsetLeft');
    const oldOffsetTop = Object.getOwnPropertyDescriptor(proto, 'offsetTop');
    const oldGetBoundingClientRect = proto.getBoundingClientRect;

    // Markers are appended in order: left-top, right-top, left-bottom, right-bottom.
    function markerIndex(el: HTMLElement) {
        return Array.prototype.indexOf.call(el.parentNode.children, el);
    }

    beforeAll(function () {
        Object.defineProperty(proto, 'offsetLeft', {
            configurable: true,
            get() {
                return (markerIndex(this) % 2) * WIDTH;
            }
        });
        Object.defineProperty(proto, 'offsetTop', {
            configurable: true,
            get() {
                return (markerIndex(this) >> 1) * HEIGHT;
            }
        });
        proto.getBoundingClientRect = function () {
            const left = ELEMENT_LEFT + this.offsetLeft;
            const top = ELEMENT_TOP - scrollY + this.offsetTop;
            return { left, top, right: left, bottom: top, width: 0, height: 0, x: left, y: top } as DOMRect;
        };
    });

    afterAll(function () {
        Object.defineProperty(proto, 'offsetLeft', oldOffsetLeft);
        Object.defineProperty(proto, 'offsetTop', oldOffsetTop);
        proto.getBoundingClientRect = oldGetBoundingClientRect;
    });

    it('transformCoordWithViewport inverse should not be stale after forward refreshes', function () {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const out: number[] = [];

        scrollY = 0;
        // Build the inverse transformer first (local -> viewport).
        expect(transformCoordWithViewport(out, el, 5, 6, true)).toBe(true);
        expect(out[0]).toBeCloseTo(ELEMENT_LEFT + 5);
        expect(out[1]).toBeCloseTo(ELEMENT_TOP + 6);

        // Scroll, then use the forward transformer (viewport -> local).
        scrollY = 50;
        expect(transformCoordWithViewport(out, el, ELEMENT_LEFT + 5, ELEMENT_TOP - scrollY + 6)).toBe(true);
        expect(out[0]).toBeCloseTo(5);
        expect(out[1]).toBeCloseTo(6);

        // The inverse transformer must reflect the new position too.
        expect(transformCoordWithViewport(out, el, 5, 6, true)).toBe(true);
        expect(out[0]).toBeCloseTo(ELEMENT_LEFT + 5);
        expect(out[1]).toBeCloseTo(ELEMENT_TOP - scrollY + 6);

        document.body.removeChild(el);
    });
});
