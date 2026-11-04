import { platformApi } from '../../../../src/core/platform';
import { parsePlainText } from '../../../../src/graphic/helper/parseText';

describe('slow ASCII width map fallback', () => {
    it('uses cached widths of actual characters for subsequent fonts', () => {
        jest.useFakeTimers();
        const originalMeasureText = platformApi.measureText;
        const counts: Record<string, number> = {};
        platformApi.measureText = (text, font) => {
            const key = font + ':' + text;
            counts[key] = (counts[key] || 0) + 1;
            if (font === 'slow-test-font' && text === '\0') {
                jest.advanceTimersByTime(17);
            }
            return {width: Array.from(text).reduce((sum, ch) => sum + (ch === 'i' ? 1 : ch === 'W' ? 10 : 5), 0)};
        };
        try {
            parsePlainText('warmup', {font: 'slow-test-font', width: 100, overflow: 'breakAll'}, null, null);
            const style = {font: 'later-test-font', width: 12, overflow: 'breakAll' as const};
            const first = parsePlainText('iiiiWWWW', style, null, null);
            expect(first.lines).toEqual(['iiii', 'W', 'W', 'W', 'W']);
            const second = parsePlainText('iiiiWWWW', style, null, null);
            expect(second.lines).toEqual(first.lines);
            expect(counts['later-test-font:i']).toBe(1);
            expect(counts['later-test-font:W']).toBe(1);
        }
        finally {
            platformApi.measureText = originalMeasureText;
            jest.useRealTimers();
        }
    });
});
