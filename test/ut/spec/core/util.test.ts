import * as zrUtil from '../../../../src/core/util';

describe('zrUtil', function() {

    describe('merge', function () {

        it('basic', function () {
            expect(zrUtil.merge({}, {a: 121})).toEqual({a: 121});
            expect(zrUtil.merge({a: 'zz'}, {a: '121'}, true)).toEqual({a: '121'});
            expect(zrUtil.merge({a: 'zz', b: {c: 1212}}, {b: {c: 'zxcv'}}, true)).toEqual({a: 'zz', b: {c: 'zxcv'}});
        });
        it('overwrite', function () {
            expect(zrUtil.merge({a: {b: 'zz'}}, {a: '121'}, true)).toEqual({a: '121'});
            expect(zrUtil.merge({a: null}, {a: '121'}, true)).toEqual({a: '121'});
            expect(zrUtil.merge({a: '12'}, {a: null}, true)).toEqual({a: null});
            expect(zrUtil.merge({a: {a: 'asdf'}}, {a: undefined}, true)).toEqual({a: undefined});
            const b = {b: 'vvv'}; // not same object
            const result = zrUtil.merge({a: null}, {a: b}, true);
            expect(result).toEqual({a: {b: 'vvv'}});
            expect(result.a === b).toEqual(false);
        });
        it('not_overwrite', function () {
            expect(zrUtil.merge({a: {b: 'zz'}}, {a: '121'}, false)).toEqual({a: {b: 'zz'}});
            expect(zrUtil.merge({a: null}, {a: '121'}, false)).toEqual({a: null});
            expect(zrUtil.merge({a: '12'}, {a: null}, false)).toEqual({a: '12'});
            expect(zrUtil.merge({a: {a: 'asdf'}}, {a: undefined}, false)).toEqual({a: {a: 'asdf'}});
        });
        it('array', function () {
            expect(zrUtil.merge({a: {a: 'asdf'}}, {a: ['asdf', 'zxcv']}, true)).toEqual({a: ['asdf', 'zxcv']});
            expect(zrUtil.merge({a: {a: [12, 23, 34]}}, {a: {a: [99, 88]}}, false)).toEqual({a: {a: [12, 23, 34]}});
            const b = [99, 88]; // not same object
            const result = zrUtil.merge({a: {a: [12, 23, 34]}}, {a: {a: b}}, true);
            expect(result).toEqual({a: {a: b}});
            expect(result.a.a === b).toEqual(false);
        });
        it('null_undefined', function () {
            expect(zrUtil.merge(null, {a: '121'})).toEqual(null);
            expect(zrUtil.merge(undefined, {a: '121'})).toEqual(undefined);
            expect(zrUtil.merge({a: '121'}, null)).toEqual({a: '121'});
            expect(zrUtil.merge({a: '121'}, undefined)).toEqual({a: '121'});
        });
    });

    describe('clone', function () {

        it('primary', function () {
            expect(zrUtil.clone(null)).toEqual(null);
            expect(zrUtil.clone(undefined)).toEqual(undefined);
            expect(zrUtil.clone(11)).toEqual(11);
            expect(zrUtil.clone('11')).toEqual('11');
            expect(zrUtil.clone('aa')).toEqual('aa');
        });

        it('array', function () {
            expect(zrUtil.clone([1, '2', 'a', 4, {x: 'r', y: [2, 3]}]))
                .toEqual([1, '2', 'a', 4, {x: 'r', y: [2, 3]}]);
            expect(zrUtil.clone({a: [1, '2', 'a', 4, {x: 'r', y: [2, 3]}]}).a)
                .toEqual([1, '2', 'a', 4, {x: 'r', y: [2, 3]}]);
            expect(zrUtil.clone({a: [1, [1, '2', 'a', 4, {x: 'r', y: [2, 3]}]]}).a[1])
                .toEqual([1, '2', 'a', 4, {x: 'r', y: [2, 3]}]);
        });

        it('object', function () {
            expect(zrUtil.clone({x: 1, y: [2, 3], z: {a: 3}}))
                .toEqual({x: 1, y: [2, 3], z: {a: 3}});
            expect(zrUtil.clone({a: {x: 1, y: [2, 3], z: {a: 3}}}).a)
                .toEqual({x: 1, y: [2, 3], z: {a: 3}});
            expect(zrUtil.clone({a: [1, {x: 1, y: [2, 3], z: {a: 3}}]}).a[1])
                .toEqual({x: 1, y: [2, 3], z: {a: 3}});
        });

        it('built-in', function () {
            const source = [
                new Date(),
                function () {},
                /asdf/,
                new Error()
                // new Image(),
                // document.createElement('canvas').getContext('2d').createLinearGradient(0, 0, 0, 0),
                // document.createElement('canvas').getContext('2d').createPattern(new Image(), 'repeat')
            ];

            for (let i = 0; i < source.length; i++) {
                const d = source[i];
                expect(zrUtil.clone(d) === d).toEqual(true);
                expect(zrUtil.clone({a: d}).a === d).toEqual(true);
                expect(zrUtil.clone({a: [1, d]}).a[1] === d).toEqual(true);
            }
        });

        it('TypedArray', function () {
            const types = [
                Int8Array,
                Uint8Array,
                Uint8ClampedArray,
                Int16Array,
                Uint16Array,
                Int32Array,
                Uint32Array,
                Float32Array,
                Float64Array
            ] as const;

            type TypedArray = InstanceType<typeof types[number]>;

            for (let i = 0; i < types.length; i++) {
                const d = (new types[i](3));
                d[0] = 1;
                d[2] = 2;
                expect(typedArrayExpect(d, zrUtil.clone(d))).toEqual(true);
                expect(typedArrayExpect(d, zrUtil.clone({a: d}).a)).toEqual(true);
                expect(typedArrayExpect(d, zrUtil.clone({a: [1, d]}).a[1] as TypedArray)).toEqual(true);
            }

            function typedArrayExpect(a: TypedArray, b: TypedArray) {
                if (a === b) {
                    return false;
                }
                const typeStrA = Object.prototype.toString.call(a);
                const typeStrB = Object.prototype.toString.call(b);
                if (typeStrA !== typeStrB || a.length !== b.length) {
                    return false;
                }
                for (let i = 0; i < a.length; i++) {
                    if (a[i] !== b[i]) {
                        return false;
                    }
                }
                return true;
            }
        });

        it('user_defined_class', function () {
            class Clz {
                bb: number
                aa: number
                constructor(v: number) {
                    this.bb = v;
                }
            }
            Clz.prototype.aa = 2;

            expect(zrUtil.clone(new Clz(2))).toEqual({bb: 2});
            expect(zrUtil.clone({a: new Clz(2)}).a).toEqual({bb: 2});
            expect(zrUtil.clone({a: [1, new Clz(2)]}).a[1]).toEqual({bb: 2});

        });

    });
});