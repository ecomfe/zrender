import * as colorTool from '../../../../src/tool/color';

describe('colorTool', function () {

	([
		['rgba(17, 163, 69)', [17, 163, 69, 1]],
		['rgba(17, 163, 69, 0.5)', [17, 163, 69, 0.5]],
		['rgb(17, 163, 69)', [17, 163, 69, 1]],
		['rgb(2, 163, 254, 1)', [2, 163, 254, 1]],
		['rgb(2, 163, 254, 0.8)', [2, 163, 254, 0.8]],
		['rgb(2, 163, 254, 20%)', [2, 163, 254, 0.2]],
		['rgba(2, 163, 254, 50%)', [2, 163, 254, 0.5]],
		['rgb(1e2, 0, 0)', [100, 0, 0, 1]],
		['rgba(+1E+2, 5e-1, -2e2, 50%)', [100, 1, 0, 0.5]],
		['rgb(100.9, 0, 0)', [100, 0, 0, 1]],
		['rgb(50%, 0%, 100%)', [128, 0, 255, 1]],
		['hsl(0.5turn, 100%, 50%)', [0, 255, 255, 1]],
		['hsl(3.14159rad, 100%, 50%)', [0, 255, 255, 1]],
		['hsl(200grad, 100%, 50%)', [0, 255, 255, 1]],
		['HSLA(-1.5TURN, 100%, 50%, 25%)', [0, 255, 255, 0.25]],
		['hsl(180, 100%, 50%)', [0, 255, 255, 1]],
		['hsl(540deg, 100%, 50%)', [0, 255, 255, 1]],
		['#14c4ba00', [20, 196, 186, 0]],
		['#14c4bacc', [20, 196, 186, 0.8]],
		['#14c4ba', [20, 196, 186, 1]],
		['#07f0', [0, 119, 255, 0]],
		['#07fc', [0, 119, 255, 0.8]],
		['#07f', [0, 119, 255, 1]],
		['red', [255, 0, 0, 1]],
		['blue', [0, 0, 255, 1]],
		['rebeccapurple', [102, 51, 153, 1]],
		['RebeccaPurple', [102, 51, 153, 1]]
	] as [string, number[]][]).forEach(([colorStr, colorRes]) => {
		it(`'${colorStr}' should be converted to [${colorRes.join(', ')}]`, function () {
			expect(colorTool.parse(colorStr)).toEqual(colorRes);
		});
	});

	it('rejects a trailing comma without writing to the output array', function () {
		const color = 'rgb(255, 0, 0,)';
		expect(colorTool.parse(color)).toBeUndefined();
		const out = [1, 2, 3, 4];
		expect(colorTool.parse(color, out)).toBeUndefined();
		expect(out).toEqual([1, 2, 3, 4]);
	});

	it('copies cached colors into the supplied output array', function () {
		const color = 'rgb(2e2, 0, 0)';
		const first = [0, 0, 0, 0];
		expect(colorTool.parse(color, first)).toBe(first);
		expect(first).toEqual([200, 0, 0, 1]);
		first[0] = 0;
		const second = [0, 0, 0, 0];
		expect(colorTool.parse(color, second)).toBe(second);
		expect(second).toEqual([200, 0, 0, 1]);
	});
});
