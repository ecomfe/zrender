import { platformApi, setPlatformAPI } from '../../../../src/core/platform';
import {
    ensureFontMeasureInfo, getBoundingRect, getLineHeight, getWidth, measureCharWidth
} from '../../../../src/contain/text';
import { parsePlainText, parseRichText, truncateText } from '../../../../src/graphic/helper/parseText';
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

/**
 * `[text, width]` of each token, by line.
 */
function richLines(block: ReturnType<typeof parseRichText>) {
    return block.lines.map(line => line.tokens.map(token => [token.text, token.width]));
}

/**
 * `widths[ch]`, or `defaultWidth` for the other chars.
 */
function widthOf(widths: Record<string, number>, defaultWidth: number) {
    return (ch: string) => (widths[ch] != null ? widths[ch] : defaultWidth);
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

    describe('char widths', function () {

        it('should be measured for each char, whether it is wider or narrower than 1em', function () {
            // 1em is 10px.
            stubMeasureText(widthOf({ '甲': 14, '乙': 3 }, 5));
            const overflows: TextStyleProps['overflow'][] = ['break', 'breakAll'];
            for (let i = 0; i < overflows.length; i++) {
                const style = { font: '10px cw-each-' + overflows[i], overflow: overflows[i] };
                // '甲甲' is 28px wide, though it is 2em.
                expect(parsePlainText('甲甲', { ...style, width: 22 }, null, null).lines)
                    .toEqual(['甲', '甲']);
                // '甲乙' is 17px wide, though it is 2em.
                expect(parsePlainText('甲乙甲乙', { ...style, width: 17 }, null, null).lines)
                    .toEqual(['甲乙', '甲乙']);
            }
            const rich = parseRichText(
                '{a|甲乙甲乙}',
                { font: '10px cw-each-rich', width: 17, overflow: 'break', rich: { a: {} } },
                null, null, 'left'
            );
            expect(richLines(rich)).toEqual([[['甲乙', 17]], [['甲乙', 17]]]);
        });

        it('should be measured once for each char and font, also if it is 0', function () {
            const calls = stubMeasureText(ch => (ch === '\u200B' ? 0 : 5));
            const info = ensureFontMeasureInfo('10px cw-once');
            for (let i = 0; i < 3; i++) {
                expect(measureCharWidth(info, 0x61)).toBe(5);
                expect(measureCharWidth(info, 0x7532)).toBe(5);
                // Zero width space.
                expect(measureCharWidth(info, 0x200B)).toBe(0);
                // An emoji, which is a surrogate pair.
                expect(measureCharWidth(info, 0x1F600)).toBe(5);
            }
            expect(calls).toEqual(['a', '甲', '\u200B', '\uD83D\uDE00']);

            const wrapCalls = stubMeasureText(ch => (ch === '\u200B' ? 0 : 5));
            const text = new Array(51).join('ab甲\u200B');
            const style: TextStyleProps = { font: '10px cw-once-wrap', width: 1000, overflow: 'break' };
            parsePlainText(text, style, null, null);
            // Each char, then the line.
            expect(wrapCalls).toEqual(['a', 'b', '甲', '\u200B', text]);
            parsePlainText(text, style, null, null);
            expect(wrapCalls.length).toBe(5);
        });

        it('should measure only the chars in use', function () {
            const calls = stubMeasureText(() => 5);
            const font = '10px cw-in-use';
            ensureFontMeasureInfo(font);
            getLineHeight(font);
            expect(calls).toEqual([]);
            parsePlainText('ba ba', { font: font, width: 100, overflow: 'break' }, null, null);
            expect(calls).toEqual(['b', 'a', ' ', 'ba ba']);

            // The width of 'a' is needed only for `truncateMinChar`.
            const truncateCalls = stubMeasureText(() => 5);
            truncateText('xyzxyzxyz', 32, '10px cw-in-use-truncate');
            expect(truncateCalls).not.toContain('a');
            expect(truncateText('xyzxyzxyz', 32, '10px cw-in-use-truncate', '...', { minChar: 2 })).toBe('xyz...');
            expect(truncateCalls).toContain('a');
        });
    });

    describe('truncation', function () {

        it('should estimate with the width of each char', function () {
            stubMeasureText(ch => (ch === '乙' ? 3 : 14));
            // 20px are available. Six chars of 3px fit, though they are 6em.
            expect(truncateText('乙乙乙乙乙乙乙乙', 21, '10px truncate-each', '')).toBe('乙乙乙乙乙乙');
            expect(parsePlainText(
                '乙乙乙乙乙乙乙乙', { font: '10px truncate-each', width: 21, overflow: 'truncate', ellipsis: '' }, null, null
            ).lines).toEqual(['乙乙乙乙乙乙']);
        });
    });

    describe('measured text', function () {

        it('should not have 国 if the text does not', function () {
            const calls = stubMeasureText(() => 5);
            const text = 'ab cd 甲乙甲乙';
            const richText = '{a|' + text + '}';
            const rich = { a: {} };

            getLineHeight('10px mt-line-height');
            getWidth(text, '10px mt-width');
            getBoundingRect(text, '10px mt-bounding-rect');
            parsePlainText(text, { font: '10px mt-break', width: 20, overflow: 'break' }, null, null);
            parsePlainText(text, { font: '10px mt-break-all', width: 20, overflow: 'breakAll' }, null, null);
            parsePlainText(text, { font: '10px mt-truncate', width: 20, overflow: 'truncate' }, null, null);
            parseRichText(
                richText, { font: '10px mt-rich-break', width: 20, overflow: 'break', rich: rich }, null, null, 'left'
            );
            parseRichText(
                richText, { font: '10px mt-rich-truncate', width: 20, overflow: 'truncate', rich: rich },
                null, null, 'left'
            );
            truncateText(text, 20, '10px mt-truncate-text');
            new Text({ style: { text: text + '\n' + text, font: '10px mt-text' } }).getBoundingRect();

            expect(calls.length).toBeGreaterThan(0);
            expect(calls.join('')).not.toContain(GUO);
        });

        it('should have 国 if the text does', function () {
            const calls = stubMeasureText(ch => (ch === GUO ? 9 : 5));
            expect(getWidth('国甲', '10px mt-guo')).toBe(14);
            expect(calls).toContain('国甲');
            expect(parsePlainText('国甲', { font: '10px mt-guo-wrap', width: 9, overflow: 'break' }, null, null).lines)
                .toEqual(['国', '甲']);
            expect(calls).toContain(GUO);
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
