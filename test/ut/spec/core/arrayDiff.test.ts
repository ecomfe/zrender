import arrayDiff from '../../../../src/core/arrayDiff';

describe('arrayDiff', function () {

    it('Basic', function () {
        const newArr = [{"name":"类目12"},{"name":"类目13"},{"name":"类目14"},{"name":"类目15"},{"name":"类目16"},{"name":"类目17"}];
        const oldArr = [{"name":"类目11"},{"name":"类目12"},{"name":"类目13"},{"name":"类目14"},{"name":"类目15"},{"name":"类目16"}];

        const result = arrayDiff(newArr, oldArr, function (a, b) {
            return a.name === b.name;
        });
        expect(result[0].added).toBe(true);
        expect(result[0].removed).toBe(false);
        expect(result[0].indices).toEqual([0]);

        expect(result[1].indices).toEqual([1, 2, 3, 4, 5]);
        expect(result[1].added).toBe(false);
        expect(result[1].removed).toBe(false);

        expect(result[2].removed).toBe(true);
        expect(result[2].added).toBe(false);
        expect(result[2].indices).toEqual([5]);
    });
    it('All same array', function () {
        const result = arrayDiff([1, 2, 3, 4], [1, 2, 3, 4]);
        expect(result[0].added).toBe(false);
        expect(result[0].removed).toBe(false);
        expect(result[0].indices).toEqual([0, 1, 2, 3])
    });

    it('All different array', function () {
        const result = arrayDiff([1, 2], [3, 4]);
        expect(result[0].added).toBe(true);
        expect(result[0].removed).toBe(false);
        expect(result[0].indices).toEqual([0, 1]);

        expect(result[1].added).toBe(false);
        expect(result[1].removed).toBe(true);
        expect(result[1].indices).toEqual([0, 1]);
    });
});