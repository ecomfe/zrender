/**
 * @jest-environment jsdom
 */
import { platformApi, setPlatformAPI } from '../../../../src/core/platform';
import { getLineHeight } from '../../../../src/contain/text';

const PX_FONT_REG = /^\d+px /;

/**
 * A canvas whose context normalizes the font that it is given, and keeps the previous one
 * if it does not accept the new one.
 */
function createFakeCanvas(normalized: Record<string, string>) {
    let current = '10px sans-serif';
    const ctx = {};
    Object.defineProperty(ctx, 'font', {
        get() {
            return current;
        },
        set(font: string) {
            if (normalized[font] != null) {
                current = normalized[font];
                return;
            }
            if (PX_FONT_REG.test(font)) {
                current = font;
            }
        }
    });
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getContext', { value: () => ctx });
    return canvas;
}

describe('line height with a canvas', function () {

    const originalMeasureText = platformApi.measureText;
    const originalCreateCanvas = platformApi.createCanvas;

    afterAll(function () {
        setPlatformAPI({
            measureText: originalMeasureText,
            createCanvas: originalCreateCanvas
        });
    });

    it('should let the canvas resolve a relative size or a keyword', function () {
        const measured: string[] = [];
        setPlatformAPI({
            measureText(text: string) {
                measured.push(text);
                return { width: 99 };
            },
            createCanvas() {
                return createFakeCanvas({
                    'bold 1.5em lh-canvas': 'bold 15px lh-canvas',
                    '1.5em/20px lh-canvas': '15px lh-canvas',
                    // Neither a line height nor a part of a font family is the font size.
                    'x-large/20px "lh-canvas 12px"': '24px "lh-canvas 12px"',
                    // Some canvas does not tell the size of a system font.
                    'menu': 'menu'
                });
            }
        });
        expect(getLineHeight('bold 1.5em lh-canvas')).toBe(15);
        expect(getLineHeight('1.5em/20px lh-canvas')).toBe(15);
        expect(getLineHeight('x-large/20px "lh-canvas 12px"')).toBe(24);
        expect(getLineHeight('menu')).toBe(12);
        // A font that the canvas does not accept.
        expect(getLineHeight('1.5em/ lh-canvas')).toBe(12);
        // '国' is not measured for it.
        expect(measured).not.toContain('国');
    });
});
