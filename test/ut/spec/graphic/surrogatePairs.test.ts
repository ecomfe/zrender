import { truncateText, parsePlainText } from '../../../../src/graphic/helper/parseText';
import { setPlatformAPI } from '../../../../src/core/platform';

// A deterministic stand-in for canvas measurement, so the assertions do not
// depend on a font: every UTF-16 code unit is 10px wide.
const FONT = '12px sans-serif';
const measureText = (text: string) => ({ width: text.length * 10 });

// U+1F600 and U+20BB7 are both outside the BMP, so each is a surrogate pair.
const EMOJI = '\u{1F600}';
const KANJI = '\u{20BB7}';

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe('surrogate pairs in text layout', function () {

    beforeAll(function () {
        setPlatformAPI({ measureText });
    });

    describe('truncateText', function () {

        it('should not leave half a surrogate pair when cutting', function () {
            for (const text of [EMOJI.repeat(6), KANJI.repeat(4), 'a' + EMOJI + 'b' + EMOJI]) {
                for (const width of [30, 50, 70]) {
                    const out = truncateText(text, width, FONT, '...');
                    expect(LONE_SURROGATE.test(out)).toBe(false);
                }
            }
        });

        it('should still cut plain text exactly where it did before', function () {
            expect(truncateText('hello world', 50, FONT, '...')).toBe('h...');
            expect(truncateText('中文中文中文', 50, FONT, '...')).toBe('中...');
        });
    });

    describe('parsePlainText with overflow break', function () {

        it('should not split a surrogate pair across a line break', function () {
            for (const text of [EMOJI.repeat(6), KANJI.repeat(4)]) {
                for (const width of [30, 50, 70]) {
                    const { lines } = parsePlainText(text, { font: FONT, overflow: 'break', width }, null, null);
                    for (const line of lines) {
                        expect(LONE_SURROGATE.test(line)).toBe(false);
                    }
                }
            }
        });

        it('should keep every character, in order', function () {
            const text = EMOJI.repeat(5);
            const { lines } = parsePlainText(text, { font: FONT, overflow: 'break', width: 50 }, null, null);
            expect(lines.join('')).toBe(text);
        });

        it('should wrap text inside the BMP as it did before', function () {
            const { lines } = parsePlainText('中文中文中文', { font: FONT, overflow: 'break', width: 30 }, null, null);
            expect(lines).toEqual(['中文中', '文中文']);
        });
    });
});
