import {parsePlainText, parseRichText} from '../../../../src/graphic/helper/parseText';

const font = '12px sans-serif';

function getRichLines(text: string, overflow?: 'break' | 'breakAll' | 'truncate', width?: number) {
    const block = parseRichText(text, {
        font,
        overflow,
        width,
        rich: {
            name: {font: '18px sans-serif'},
            note: {font: '10px sans-serif'}
        }
    }, null, null, 'left');

    return block.lines.map(line => line.tokens.map(token => token.text).join(''));
}

describe('parseText', function () {
    it('preserves newlines between rich text runs when wrapping', function () {
        expect(getRichLines('{name|First line}\n{note|Second line}', 'break', 280))
            .toEqual(['First line', 'Second line']);
        expect(getRichLines('{name|First line}\n{note|Second line}', 'breakAll', 280))
            .toEqual(['First line', 'Second line']);
    });

    it('preserves consecutive and trailing newlines between rich text runs', function () {
        expect(getRichLines('{name|First line}\n\n{note|Second line}', 'break', 280))
            .toEqual(['First line', '', 'Second line']);
        expect(getRichLines('{name|First line\n}{note|Second line}', 'break', 280))
            .toEqual(['First line', 'Second line']);
        expect(getRichLines('\n', 'break', 280)).toEqual(['', '']);
    });

    it('preserves newlines between plain and rich text', function () {
        expect(getRichLines('First line\n{note|Second line}', 'break', 280))
            .toEqual(['First line', 'Second line']);
        expect(getRichLines('{name|First line}\nSecond line', 'break', 280))
            .toEqual(['First line', 'Second line']);
    });

    it('keeps leading newlines and preserves truncate behavior', function () {
        expect(getRichLines('{name|First line}{note|\nSecond line}', 'break', 280))
            .toEqual(['First line', 'Second line']);
        expect(getRichLines('{name|First line}\n{note|Second line}', 'truncate', 280))
            .toEqual(['First line', 'Second line']);
    });

    it('preserves final empty lines in plain text when wrapping', function () {
        const block = parsePlainText('text\n', {font, overflow: 'break', width: 280}, null, null);
        expect(block.lines).toEqual(['text', '']);
    });

    it('continues to wrap long text automatically', function () {
        const text = 'Long text that needs automatic wrapping';
        const block = parsePlainText(text, {font, overflow: 'breakAll', width: 30}, null, null);
        expect(block.lines.length).toBeGreaterThan(1);
        expect(block.lines.join('')).toBe(text);
    });
});
