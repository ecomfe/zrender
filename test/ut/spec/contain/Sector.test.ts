import {Sector} from '../zrender';

describe('Path', function () {

    // Some regression tests.
    it('Should not contain the point.', function () {
        const sector = new Sector({
            shape: {
                clockwise: true,
                cornerRadius: 5,
                cx: 1150.5,
                cy: 625.5,
                startAngle: -1.5707963267948966,
                endAngle: 4.71238898038469,
                r: 218.92499999999998,
                r0: 93.825
            },
            style: {
                fill: 'rgba(218,29,35,1)',
                lineJoin: 'bevel',
                lineWidth: 2,
                opacity: 1,
                shadowBlur: 0,
                shadowColor: 'rgba(0,0,0,0.2)',
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                stroke: 'rgba(255,255,255,1)'
            }
        });

        expect(sector.contain(1146, 619)).toBeFalsy();
        expect(sector.contain(471, 613)).toBeFalsy();
        expect(sector.contain(491, 705)).toBeFalsy();
        expect(sector.contain(1922, 594)).toBeFalsy();
        expect(sector.contain(1949, 738)).toBeFalsy();
        expect(sector.contain(1142, 49)).toBeFalsy();
        expect(sector.contain(1163, 1185)).toBeFalsy();
        expect(sector.contain(269, 508)).toBeFalsy();
    });
});