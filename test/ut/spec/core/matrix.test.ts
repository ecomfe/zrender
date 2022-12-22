import * as matrix from '../../../../src/core/matrix';

describe('zrUtil', function () {
    const identity = [1, 0, 0, 1, 0, 0];
    it('create', function () {
        expect(matrix.create()).toStrictEqual(identity);
    });
    it('identity', function () {
        const origin = [1, 2, 3, 1, 2, 3];
        matrix.identity(origin);
        expect(origin).toStrictEqual(identity);
    });
    it('copy', function () {
        const origin = [1, 2, 3, 4, 5, 6];
        const target = [0];
        matrix.copy(target, origin);
        expect(target).toStrictEqual(origin);
    });
});
