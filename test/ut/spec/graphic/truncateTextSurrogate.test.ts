import { truncateText } from '../../../../src/graphic/helper/parseText';
import { platformApi, setPlatformAPI } from '../../../../src/core/platform';

// '𠮷' is U+20BB7, encoded as the surrogate pair 0xD842 0xDFB7.
const KANJI = '𠮷';

// A deterministic width model so the test does not depend on a real canvas:
// ASCII code points have width 1, everything else (e.g. fullwidth CJK) width 2.
// A surrogate pair is measured as a single width-2 glyph, the same way a real
// `measureText` would treat it.
function fakeMeasureText(text: string): { width: number } {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
            width += 2;
            i++;
        }
        else {
            width += code < 0x80 ? 1 : 2;
        }
    }
    return { width };
}

function hasLoneSurrogate(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDBFF) {
            const next = str.charCodeAt(i + 1);
            if (!(next >= 0xDC00 && next <= 0xDFFF)) {
                return true;
            }
            i++;
        }
        else if (code >= 0xDC00 && code <= 0xDFFF) {
            return true;
        }
    }
    return false;
}

describe('truncateText surrogate pairs', function () {
    // A unique font so `ensureFontMeasureInfo` does not reuse another test's cache.
    const font = '12px ZRTruncateSurrogateTestFont';
    let originalMeasureText: typeof platformApi.measureText;

    beforeAll(function () {
        originalMeasureText = platformApi.measureText;
        setPlatformAPI({ measureText: fakeMeasureText });
    });

    afterAll(function () {
        setPlatformAPI({ measureText: originalMeasureText });
    });

    it('should not split a surrogate pair (CJK Extension B) when truncating', function () {
        const result = truncateText(KANJI + KANJI + KANJI + KANJI, 6, font, '');
        expect(hasLoneSurrogate(result)).toBe(false);
        expect(result).toBe(KANJI);
    });

    it('should keep complete characters when the text fits', function () {
        const text = KANJI + KANJI;
        expect(truncateText(text, 20, font, '')).toBe(text);
    });

    it('should keep truncating ASCII text by character as before', function () {
        const result = truncateText('aaaaaaaa', 4, font, '');
        expect(hasLoneSurrogate(result)).toBe(false);
        expect(result).toBe('aaa');
    });
});
