import * as platform from '../../../../src/core/platform';

describe('platform', function() {

    it('Default font should be correct', function () {
        expect(platform.DEFAULT_FONT_SIZE).toBe(12);
        expect(platform.DEFAULT_FONT_FAMILY).toBe('sans-serif');
        expect(platform.DEFAULT_FONT).toBe('12px sans-serif');
    });

    it('setPlatformAPI can override methods', function () {
        function createCanvas() {
            return {
                width: 1
            }as HTMLCanvasElement;
        }
        function measureText() {
            return { width: 16.5 };
        }

        const oldCreateCanvas = platform.platformApi.createCanvas;
        const oldMeasureText = platform.platformApi.measureText;
        platform.setPlatformAPI({
            createCanvas,
            measureText
        });
        expect(platform.platformApi.createCanvas().width).toBe(1);
        expect(platform.platformApi.measureText('a', '12px sans-serif').width).toBe(16.5);

        // Restore
        platform.setPlatformAPI({
            createCanvas: oldCreateCanvas,
            measureText: oldMeasureText
        });
    })
});