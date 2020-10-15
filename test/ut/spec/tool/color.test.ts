import * as colorTool from '../../../../src/tool/color';

describe('colorTool', function () {

	it(`\`rgba(17, 263, 69)\` should be converted to [17, 263, 69, 1]`, function () {
		expect(colorTool.parse('rgba(17, 263, 69)')).toEqual([17, 263, 69, 1]);
	});

	it(`\`#14c4baff\` should be converted to [20, 196, 186, 1]`, function () {
		expect(colorTool.parse('#14c4baff')).toEqual([20, 196, 186, 1]);
	});

	it(`\`#07f0\` should be converted to [0, 119, 255, 0]`, function () {
		expect(colorTool.parse('#07f0')).toEqual([0, 119, 255, 0]);
	});

});
