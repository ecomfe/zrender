import { platformApi, setPlatformAPI } from '../../../../src/core/platform';
import { getLineHeight } from '../../../../src/contain/text';
import { parsePlainText } from '../../../../src/graphic/helper/parseText';
import Text, { TextStyleProps } from '../../../../src/graphic/Text';
import TSpan from '../../../../src/graphic/TSpan';
import { init, registerPainter } from '../../../../src/zrender';
import SVGPainter from '../../../../src/svg/Painter';

// zrender caches measurements per font string, so every case uses its own font family.

const GUO = '国';

/**
 * Call `cb` for each char of `text`. A surrogate pair is one char.
 */
function eachChar(text: string, cb: (ch: string) => void) {
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        const next = text.charCodeAt(i + 1);
        const isPair = code >= 0xD800 && code <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF;
        cb(text.substr(i, isPair ? 2 : 1));
        if (isPair) {
            i++;
        }
    }
}

/**
 * A stand-in for canvas `measureText` that sums the width of each char.
 * @param runCharWidth The width of a char in a longer text, if it differs, e.g., in another fallback font.
 * @return The texts that have been measured.
 */
function stubMeasureText(charWidth: (ch: string) => number, runCharWidth?: (ch: string) => number) {
    const calls: string[] = [];
    setPlatformAPI({
        measureText(text: string) {
            calls.push(text);
            const chars: string[] = [];
            eachChar(text, ch => chars.push(ch));
            let width = 0;
            for (let i = 0; i < chars.length; i++) {
                width += runCharWidth != null && chars.length > 1 ? runCharWidth(chars[i]) : charWidth(chars[i]);
            }
            return { width };
        }
    });
    return calls;
}

describe('text measurement', function () {

    const originalMeasureText = platformApi.measureText;
    const originalCreateCanvas = platformApi.createCanvas;

    afterAll(function () {
        setPlatformAPI({
            measureText: originalMeasureText,
            createCanvas: originalCreateCanvas
        });
    });

    describe('line height', function () {

        it('should be the font size, whatever 国 measures', function () {
            stubMeasureText(ch => (ch === GUO ? 6 : 5));
            expect(getLineHeight('10px lh-guo-6')).toBe(10);

            stubMeasureText(ch => (ch === GUO ? 13 : 5));
            const block = parsePlainText('ab\nab', { font: '10px lh-guo-13' }, null, null);
            expect(block.lineHeight).toBe(10);
            expect(block.contentHeight).toBe(20);
        });

        it('should be the px size in the font string', function () {
            stubMeasureText(() => 99);
            expect(getLineHeight('13.533333333333333px lh-px')).toBe(13.533333333333333);
            expect(getLineHeight('italic small-caps bold 16px/2 lh-px')).toBe(16);
            expect(getLineHeight('700 12px "lh px 20px"')).toBe(12);
            expect(getLineHeight('oblique 10deg 14px lh-px')).toBe(14);
            expect(getLineHeight('11PX lh-px')).toBe(11);
            expect(getLineHeight('.5px lh-px')).toBe(0.5);
            expect(getLineHeight('1e1px lh-px')).toBe(10);
            // A tiny number is converted to a string like this, e.g., in an animation.
            expect(getLineHeight('1e-7px lh-px')).toBe(1e-7);
        });

        it('should keep 0 for a zero font size', function () {
            stubMeasureText(() => 99);
            expect(getLineHeight('0px lh-zero')).toBe(0);
            expect(getLineHeight('0.0px lh-zero')).toBe(0);
            expect(getLineHeight('bold 0em lh-zero')).toBe(0);
        });

        it('should convert absolute units', function () {
            stubMeasureText(() => 99);
            expect(getLineHeight('9pt lh-abs')).toBe(12);
            expect(getLineHeight('10.5pt lh-abs')).toBe(14);
            expect(getLineHeight('1pc lh-abs')).toBe(16);
            expect(getLineHeight('1in lh-abs')).toBe(96);
            expect(getLineHeight('2.54cm lh-abs')).toBeCloseTo(96, 10);
        });

        it('should be the default font size if a relative size or a keyword can not be resolved', function () {
            // There is no canvas in this environment.
            stubMeasureText(() => 99);
            expect(getLineHeight('1.5em lh-no-canvas')).toBe(12);
            expect(getLineHeight('150% lh-no-canvas')).toBe(12);
            expect(getLineHeight('x-large lh-no-canvas')).toBe(12);
            expect(getLineHeight('caption')).toBe(12);
        });
    });

    describe('layout', function () {

        registerPainter('svg', SVGPainter);

        const SVG_TEXT_TAG_REG = /<text[^>]*>/g;
        const Y_ATTR_REG = / y="([^"]+)"/;

        function lineYs(style: TextStyleProps) {
            const text = new Text({ style: style });
            text.getBoundingRect();
            const zr = init(null, { renderer: 'svg', ssr: true, width: 100, height: 100 });
            zr.add(text);
            const svg = zr.painter.renderToString();
            zr.dispose();
            const tspanYs: number[] = [];
            text.childrenRef().forEach(child => {
                if (child instanceof TSpan) {
                    tspanYs.push(child.style.y);
                }
            });
            return {
                tspan: tspanYs,
                svg: svg.match(SVG_TEXT_TAG_REG).map(tag => +Y_ATTR_REG.exec(tag)[1])
            };
        }

        it('should put lines 1em apart, or apart by the line height, in canvas and SVG', function () {
            stubMeasureText(ch => (ch === GUO ? 13 : 5));
            const byDefault = lineYs({ text: 'ab\nab', font: '10px layout' });
            expect(byDefault.tspan[1] - byDefault.tspan[0]).toBe(10);
            expect(byDefault.svg[1] - byDefault.svg[0]).toBe(10);

            const byLineHeight = lineYs({ text: 'ab\nab', font: '10px layout', lineHeight: 16 });
            expect(byLineHeight.tspan[1] - byLineHeight.tspan[0]).toBe(16);
            expect(byLineHeight.svg[1] - byLineHeight.svg[0]).toBe(16);

            const rich = lineYs({ text: '{a|ab}\n{a|ab}', font: '10px layout', rich: { a: {} } });
            expect(rich.tspan[1] - rich.tspan[0]).toBe(10);
            expect(rich.svg[1] - rich.svg[0]).toBe(10);
        });
    });
});
