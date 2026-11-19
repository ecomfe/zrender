import { createFromString } from '../../../../src/tool/path';

describe('tool/path', function () {

    function bounds(svgPath: string) {
        const rect = createFromString(svgPath).getBoundingRect();
        return [rect.x, rect.y, rect.width, rect.height];
    }

    it('reflects the control point of the previous group of a repeated S or T', function () {
        // the second S reflects the control point of the first one, (10, 10) about (20, 0)
        expect(bounds('M0 0 S10 10 20 0 30 -10 40 0'))
            .toEqual(bounds('M0 0 C0 0 10 10 20 0 C30 -10 30 -10 40 0'));
        expect(bounds('M0 0 s10 10 20 0 10 -10 20 0'))
            .toEqual(bounds('M0 0 C0 0 10 10 20 0 C30 -10 30 -10 40 0'));
        // the second T reflects the control point of the first one, (0, 0) about (10, 10)
        expect(bounds('M0 0 T10 10 20 0'))
            .toEqual(bounds('M0 0 Q0 0 10 10 Q20 20 20 0'));
    });

    it('reads an exponent with a plus sign', function () {
        expect(bounds('M0 0 L1e+2 5E+1')).toEqual(bounds('M0 0 L100 50'));
    });
});
