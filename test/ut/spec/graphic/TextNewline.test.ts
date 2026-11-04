import { parsePlainText, parseRichText } from '../../../../src/graphic/helper/parseText';

describe('wrapped explicit newlines', () => {
    const rich = { name: {}, note: {} };
    const cases: [string, string[][]][] = [
        ['{name|First line}\n{note|Second line}', [['First line'], ['Second line']]],
        ['{name|First line\n}{note|Second line}', [['First line'], ['Second line']]],
        ['{name|First line}\n\n{note|Second line}', [['First line'], [''], ['Second line']]],
        ['First line\n{note|Second line}', [['First line'], ['Second line']]],
        ['{name|First line}{note|\nSecond line}', [['First line'], ['Second line']]]
    ];
    for (const overflow of ['break', 'breakAll'] as const) {
        it(`preserves rich text boundaries with ${overflow}`, () => {
            cases.forEach(([text, expected]) => {
                const block = parseRichText(text, {font: '12px sans-serif', rich, width: 280, overflow}, null, null, 'left');
                expect(block.lines.map(line => line.tokens.map(token => token.text))).toEqual(expected);
            });
        });
        it(`keeps a trailing empty plain line with ${overflow}`, () => {
            const block = parsePlainText('First line\n', {font: '12px sans-serif', width: 280, overflow}, null, null);
            expect(block.lines).toEqual(['First line', '']);
        });
    }
});
