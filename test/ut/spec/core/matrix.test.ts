import { rotate } from '../../../../src/core/matrix';

describe('matrix', function () {
    it('should rotate relative to a pivot point', function () {
        const matrix = [
            0.9659258262890683, 0.25881904510252074, -0.25881904510252074, 0.9659258262890683,
            40.213201392710246, -26.96358986452364
        ];
        const rad = -0.2617993877991494;
        const pivot = [122.511, 139.243];

        const result = rotate(matrix, matrix, rad, pivot);

        expect(result[0]).toBeCloseTo(0.8660254037844387, 5);
        expect(result[1]).toBeCloseTo(0.49999999999999994, 5);
        expect(result[2]).toBeCloseTo(-0.49999999999999994, 5);
        expect(result[3]).toBeCloseTo(0.8660254037844387, 5);
        expect(result[4]).toBeCloseTo(86.03486175696463, 5);
        expect(result[5]).toBeCloseTo(-42.600475299156585, 5);
    });
});
