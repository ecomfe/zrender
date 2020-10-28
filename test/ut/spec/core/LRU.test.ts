import LRU from '../../../../src/core/LRU';

describe('lru', function () {
    it('Basic', function () {
        var lru = new LRU<string>(5);

        for (var i = 0; i < 5; i++) {
            lru.put(i, 'val' + i);
        }
        expect(lru.len()).toBe(5);

        expect(lru.get(3)).toBe('val3');
        expect(lru.get(4)).toBe('val4');
        expect(lru.get(0)).toBe('val0');
        expect(lru.get(1)).toBe('val1');

        lru.put(6, 'val6');
        expect(lru.get(2)).toBeUndefined();
        lru.put(7, 'val7');
        expect(lru.get(3)).toBeUndefined();

        lru.clear();
        expect(lru.len()).toBe(0);
        expect(lru.get(1)).toBeUndefined();
    });
});