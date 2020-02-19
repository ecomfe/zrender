import { Dictionary, ArrayLike } from "./types";
import { GradientObject } from "../graphic/Gradient";
import { PatternObject } from "../graphic/Pattern";


// 用于处理merge时无法遍历Date等对象的问题
const BUILTIN_OBJECT: {[key: string]: boolean} = {
    '[object Function]': true,
    '[object RegExp]': true,
    '[object Date]': true,
    '[object Error]': true,
    '[object CanvasGradient]': true,
    '[object CanvasPattern]': true,
    // For node-canvas
    '[object Image]': true,
    '[object Canvas]': true
};

const TYPED_ARRAY: {[key: string]: boolean}  = {
    '[object Int8Array]': true,
    '[object Uint8Array]': true,
    '[object Uint8ClampedArray]': true,
    '[object Int16Array]': true,
    '[object Uint16Array]': true,
    '[object Int32Array]': true,
    '[object Uint32Array]': true,
    '[object Float32Array]': true,
    '[object Float64Array]': true
};

const objToString = Object.prototype.toString;

const arrayProto = Array.prototype;
const nativeForEach = arrayProto.forEach;
const nativeFilter = arrayProto.filter;
const nativeSlice = arrayProto.slice;
const nativeMap = arrayProto.map;
const nativeReduce = arrayProto.reduce;

// Avoid assign to an exported constiable, for transforming to cjs.
const methods: {[key: string]: Function} = {};

export function $override(name: string, fn: Function) {
    // Clear ctx instance for different environment
    if (name === 'createCanvas') {
        _ctx = null;
    }

    methods[name] = fn;
}

let idStart = 0x0907;
/**
 * Generate unique id
 */
export function guid(): number {
    return idStart++;
}

export function logError(...args: string[]) {
    if (typeof console !== 'undefined') {
        console.error.apply(args);
    }
}
/**
 * Those data types can be cloned:
 *     Plain object, Array, TypedArray, number, string, null, undefined.
 * Those data types will be assgined using the orginal data:
 *     BUILTIN_OBJECT
 * Instance of user defined class will be cloned to a plain object, without
 * properties in prototype.
 * Other data types is not supported (not sure what will happen).
 *
 * Caution: do not support clone Date, for performance consideration.
 * (There might be a large number of date in `series.data`).
 * So date should not be modified in and out of echarts.
 */
export function clone<T extends any>(source: T): T {
    if (source == null || typeof source !== 'object') {
        return source;
    }

    let result = source;
    const typeStr = <string>objToString.call(source);

    if (typeStr === '[object Array]') {
        if (!isPrimitive(source)) {
            result = [] as any;
            for (let i = 0, len = source.length; i < len; i++) {
                result[i] = clone(source[i]);
            }
        }
    }
    else if (TYPED_ARRAY[typeStr]) {
        if (!isPrimitive(source)) {
            const Ctor = source.constructor;
            if (Ctor.from) {
                result = Ctor.from(source);
            }
            else {
                result = new Ctor(source.length);
                for (let i = 0, len = source.length; i < len; i++) {
                    result[i] = clone(source[i]);
                }
            }
        }
    }
    else if (!BUILTIN_OBJECT[typeStr] && !isPrimitive(source) && !isDom(source)) {
        result = {} as any;
        for (let key in source) {
            if (source.hasOwnProperty(key)) {
                result[key] = clone(source[key]);
            }
        }
    }

    return result;
}

export function merge(target: any, source: any, overwrite?: boolean) {
    // We should escapse that source is string
    // and enter for ... in ...
    if (!isObject(source) || !isObject(target)) {
        return overwrite ? clone(source) : target;
    }

    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            const targetProp = target[key];
            const sourceProp = source[key];

            if (isObject(sourceProp)
                && isObject(targetProp)
                && !isArray(sourceProp)
                && !isArray(targetProp)
                && !isDom(sourceProp)
                && !isDom(targetProp)
                && !isBuiltInObject(sourceProp)
                && !isBuiltInObject(targetProp)
                && !isPrimitive(sourceProp)
                && !isPrimitive(targetProp)
            ) {
                // 如果需要递归覆盖，就递归调用merge
                merge(targetProp, sourceProp, overwrite);
            }
            else if (overwrite || !(key in target)) {
                // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                // NOTE，在 target[key] 不存在的时候也是直接覆盖
                target[key] = clone(source[key]);
            }
        }
    }

    return target;
}

/**
 * @param targetAndSources The first item is target, and the rests are source.
 * @param overwrite
 * @return Merged result
 */
export function mergeAll(targetAndSources: any[], overwrite: boolean): any {
    let result = targetAndSources[0];
    for (let i = 1, len = targetAndSources.length; i < len; i++) {
        result = merge(result, targetAndSources[i], overwrite);
    }
    return result;
}

export function extend<
    T extends Dictionary<any>,
    S extends Dictionary<any>
>(target: T, source: S): T & S {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            (target as Dictionary<any>)[key] = source[key];
        }
    }
    return target as T & S;
}

export function defaults<
    T extends Dictionary<any>,
    S extends Dictionary<any>
>(target: T, source: S, overlay?: boolean): T & S {
    for (let key in source) {
        if (source.hasOwnProperty(key)
            && (overlay ? source[key] != null : target[key] == null)
        ) {
            (target as Dictionary<any>)[key] = source[key];
        }
    }
    return target as T & S;
}

export const createCanvas = function (): HTMLCanvasElement {
    return methods.createCanvas();
};

methods.createCanvas = function (): HTMLCanvasElement {
    return document.createElement('canvas');
};

// FIXME
let _ctx: CanvasRenderingContext2D;

export function getContext(): CanvasRenderingContext2D {
    if (!_ctx) {
        // Use util.createCanvas instead of createCanvas
        // because createCanvas may be overwritten in different environment
        _ctx = createCanvas().getContext('2d');
    }
    return _ctx;
}

/**
 * 查询数组中元素的index
 */
export function indexOf<T>(array: T[], value: T): number {
    if (array) {
        if (array.indexOf) {
            return array.indexOf(value);
        }
        for (let i = 0, len = array.length; i < len; i++) {
            if (array[i] === value) {
                return i;
            }
        }
    }
    return -1;
}

/**
 * 构造类继承关系
 *
 * @param clazz 源类
 * @param baseClazz 基类
 */
export function inherits(clazz: Function, baseClazz: Function) {
    const clazzPrototype = clazz.prototype;
    function F() {}
    F.prototype = baseClazz.prototype;
    clazz.prototype = new (F as any)();

    for (let prop in clazzPrototype) {
        if (clazzPrototype.hasOwnProperty(prop)) {
            clazz.prototype[prop] = clazzPrototype[prop];
        }
    }
    clazz.prototype.constructor = clazz;
    (clazz as any).superClass = baseClazz;
}

export function mixin<T, S>(target: T | Function, source: S | Function, override?: boolean) {
    target = 'prototype' in target ? target.prototype : target;
    source = 'prototype' in source ? source.prototype : source;

    defaults(target, source, override);
}

/**
 * Consider typed array.
 * @param data
 */
export function isArrayLike(data: any): data is ArrayLike<any> {
    if (!data) {
        return false;
    }
    if (typeof data === 'string') {
        return false;
    }
    return typeof data.length === 'number';
}

/**
 * 数组或对象遍历
 */
export function each<I extends Dictionary<any> | any[], Context>(
    arr: I,
    cb: (
        this: Context,
        value: I extends Dictionary<infer T> | (infer T)[] ? T : any,
        index?: I extends any[] ? number : string,
        arr?: I
    ) => void,
    context?: Context
) {
    if (!(arr && cb)) {
        return;
    }
    if (arr.forEach && arr.forEach === nativeForEach) {
        arr.forEach(cb, context);
    }
    else if (arr.length === +arr.length) {
        for (let i = 0, len = arr.length; i < len; i++) {
            cb.call(context, (arr as any[])[i], i as any, arr);
        }
    }
    else {
        for (let key in arr) {
            if (arr.hasOwnProperty(key)) {
                cb.call(context, (arr as Dictionary<any>)[key], key as any, arr);
            }
        }
    }
}

/**
 * 数组映射
 * @typeparam T Type in Array
 * @typeparam R Type Returned
 * @return
 */
export function map<T, R, Context>(
    arr: T[],
    cb: (this: Context, val: T, index?: number, arr?: T[]) => R,
    context?: Context
): R[] {
    if (!(arr && cb)) {
        return;
    }
    if (arr.map && arr.map === nativeMap) {
        return arr.map(cb, context);
    }
    else {
        const result = [];
        for (let i = 0, len = arr.length; i < len; i++) {
            result.push(cb.call(context, arr[i], i, arr));
        }
        return result;
    }
}

export function reduce<T, S, Context>(
    arr: T[],
    cb: (this: Context, previousValue: S, currentValue: T, currentIndex?: number, arr?: T[]) => S,
    memo?: S,
    context?: Context
): S {
    if (!(arr && cb)) {
        return;
    }
    for (let i = 0, len = arr.length; i < len; i++) {
        memo = cb.call(context, memo, arr[i], i, arr);
    }
    return memo;
}

/**
 * 数组过滤
 */
export function filter<T, Context>(
    arr: T[],
    cb: (this: Context, value: T, index: number, arr: T[]) => boolean,
    context?: Context
): T[] {
    if (!(arr && cb)) {
        return;
    }
    if (arr.filter && arr.filter === nativeFilter) {
        return arr.filter(cb, context);
    }
    else {
        const result = [];
        for (let i = 0, len = arr.length; i < len; i++) {
            if (cb.call(context, arr[i], i, arr)) {
                result.push(arr[i]);
            }
        }
        return result;
    }
}

/**
 * 数组项查找
 */
export function find<T, Context>(
    arr: T[],
    cb: (this: Context, value: T, index?: number, arr?: T[]) => boolean,
    context?: Context
): T {
    if (!(arr && cb)) {
        return;
    }
    for (let i = 0, len = arr.length; i < len; i++) {
        if (cb.call(context, arr[i], i, arr)) {
            return arr[i];
        }
    }
}

/**
 * Get all object keys
 */

export function keys<T extends object>(obj: T): (keyof T)[] {
    type TKeys = keyof T;
    if (Object.keys) {
        return Object.keys(obj) as TKeys[];
    }
    let keyList: TKeys[] = [];
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            keyList.push(key);
        }
    }
    return keyList;
}

export function bind<Context, Fn extends (...args: any) => any>(
    func: Fn, context: Context, ...args: any[]
): (this: Context, ...args: Parameters<Fn>) => ReturnType<Fn> {
    return function (this: Context) {
        return func.apply(context, args.concat(nativeSlice.call(arguments)));
    };
}

type Curry1<F, T1> = F extends (a: T1, ...args: infer A) => infer R ? (...args: A) => R : unknown;
type Curry2<F, T1, T2> = F extends (a: T1, b: T2, ...args: infer A) => infer R ? (...args: A) => R : unknown;
type Curry3<F, T1, T2, T3> = F extends (a: T1, b: T2, c: T3, ...args: infer A) => infer R ? (...args: A) => R : unknown;
type Curry4<F, T1, T2, T3, T4> = F extends (a: T1, b: T2, c: T3, d: T4, ...args: infer A) => infer R ? (...args: A) => R : unknown;
type CurryFunc = (...arg: any[]) => any

function curry<F extends CurryFunc, T1 extends Parameters<F>[0]>(func: F, a: T1): Curry1<F, T1>
function curry<F extends CurryFunc, T1 extends Parameters<F>[0], T2 extends Parameters<F>[1]>(func: F, a: T1, b: T2): Curry2<F, T1, T2>
function curry<F extends CurryFunc, T1 extends Parameters<F>[0], T2 extends Parameters<F>[1], T3 extends Parameters<F>[2]>(func: F, a: T1, b: T2, c: T3): Curry3<F, T1, T2, T3>
function curry<F extends CurryFunc, T1 extends Parameters<F>[0], T2 extends Parameters<F>[1], T3 extends Parameters<F>[2], T4 extends Parameters<F>[3]>(func: F, a: T1, b: T2, c: T3, d: T4): Curry4<F, T1, T2, T3, T4>
function curry(func: Function, ...args: any[]): Function {
    return function (this: any) {
        return func.apply(this, args.concat(nativeSlice.call(arguments)));
    };
}

export {curry};

/**
 * @param value
 * @return {boolean}
 */
export function isArray(value: any): value is Array<any> {
    return objToString.call(value) === '[object Array]';
}

/**
 * @param value
 * @return {boolean}
 */
export function isFunction(value: any): value is Function {
    return typeof value === 'function';
}

/**
 * @param value
 * @return {boolean}
 */
export function isString(value: any): value is String {
    return objToString.call(value) === '[object String]';
}

// Usage: `isObject(xxx)` or `isObject(SomeType)(xxx)`
// Generic T can be used to avoid "ts type gruards" casting the `value` from its original
// type `Object` implicitly so that loose its original type info in the subsequent code.
export function isObject<T = unknown>(value: any): value is (Object & T) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    const type = typeof value;
    return type === 'function' || (!!value && type === 'object');
}

export function isBuiltInObject(value: any): boolean {
    return !!BUILTIN_OBJECT[objToString.call(value)];
}

export function isTypedArray(value: any): boolean {
    return !!TYPED_ARRAY[objToString.call(value)];
}

export function isDom(value: any): value is HTMLElement {
    return typeof value === 'object'
        && typeof value.nodeType === 'number'
        && typeof value.ownerDocument === 'object';
}

export function isGradientObject(value: any): value is GradientObject {
    return (value as GradientObject).colorStops != null;
}

export function isPatternObject(value: any): value is PatternObject {
    return (value as PatternObject).image != null;
}

/**
 * Whether is exactly NaN. Notice isNaN('a') returns true.
 */
export function eqNaN(value: any): boolean {
    /* eslint-disable-next-line no-self-compare */
    return value !== value;
}

/**
 * If value1 is not null, then return value1, otherwise judget rest of values.
 * Low performance.
 * @return Final value
 */
export function retrieve<T>(...args: T[]): T {
    for (let i = 0, len = args.length; i < len; i++) {
        if (args[i] != null) {
            return args[i];
        }
    }
}

export function retrieve2<T, R>(value0: T, value1: R) {
    return value0 != null
        ? value0
        : value1;
}

export function retrieve3<T, R, W>(value0: T, value1: R, value2: W) {
    return value0 != null
        ? value0
        : value1 != null
        ? value1
        : value2;
}

type SliceParams = Parameters<typeof nativeSlice>;
export function slice<T>(arr: ArrayLike<T>, ...args: SliceParams): T[] {
    return nativeSlice.apply(arr, args as any[]);
}

/**
 * Normalize css liked array configuration
 * e.g.
 *  3 => [3, 3, 3, 3]
 *  [4, 2] => [4, 2, 4, 2]
 *  [4, 3, 2] => [4, 3, 2, 3]
 */
export function normalizeCssArray(val: number | number[]) {
    if (typeof (val) === 'number') {
        return [val, val, val, val];
    }
    const len = val.length;
    if (len === 2) {
        // vertical | horizontal
        return [val[0], val[1], val[0], val[1]];
    }
    else if (len === 3) {
        // top | horizontal | bottom
        return [val[0], val[1], val[2], val[1]];
    }
    return val;
}

export function assert(condition: any, message?: string) {
    if (!condition) {
        throw new Error(message);
    }
}

/**
 * @param str string to be trimed
 * @return trimed string
 */
export function trim(str: string): string {
    if (str == null) {
        return null;
    }
    else if (typeof str.trim === 'function') {
        return str.trim();
    }
    else {
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    }
}

const primitiveKey = '__ec_primitive__';
/**
 * Set an object as primitive to be ignored traversing children in clone or merge
 */
export function setAsPrimitive(obj: any) {
    obj[primitiveKey] = true;
}

export function isPrimitive(obj: any): boolean {
    return obj[primitiveKey];
}

/**
 * @constructor
 * @param {Object} obj Only apply `ownProperty`.
 */
export class HashMap<T> {

    data: {[key: string]: T} = {}

    constructor(obj?: HashMap<T> | Dictionary<T> | any[]) {
        const isArr = isArray(obj);
        // Key should not be set on this, otherwise
        // methods get/set/... may be overrided.
        this.data = {};
        const thisMap = this;

        (obj instanceof HashMap)
            ? obj.each(visit)
            : (obj && each(obj, visit));

        function visit(value: any, key: any) {
            isArr ? thisMap.set(value, key) : thisMap.set(key, value);
        }
    }

    // Do not provide `has` method to avoid defining what is `has`.
    // (We usually treat `null` and `undefined` as the same, different
    // from ES6 Map).
    get(key: string): T {
        return this.data.hasOwnProperty(key) ? this.data[key] : null;
    }
    set(key: string, value: T) {
        // Comparing with invocation chaining, `return value` is more commonly
        // used in this case: `const someVal = map.set('a', genVal());`
        return (this.data[key] = value);
    }
    // Although util.each can be performed on this hashMap directly, user
    // should not use the exposed keys, who are prefixed.
    each<Context>(
        cb: (this: Context, value?: T, key?: string) => void,
        context?: Context
    ) {
        context !== void 0 && (cb = bind(cb, context));
        /* eslint-disable guard-for-in */
        for (let key in this.data) {
            this.data.hasOwnProperty(key) && (cb as any)(this.data[key], key);
        }
        /* eslint-enable guard-for-in */
    }
    // Do not use this method if performance sensitive.
    removeKey(key: string) {
        delete this.data[key];
    }
}

export function createHashMap<T>(obj?: HashMap<T> | Dictionary<T> | any[]) {
    return new HashMap<T>(obj);
}

export function concatArray<T, R>(a: ArrayLike<T>, b: ArrayLike<R>): ArrayLike<T | R> {
    const newArray = new (a as any).constructor(a.length + b.length);
    for (let i = 0; i < a.length; i++) {
        newArray[i] = a[i];
    }
    const offset = a.length;
    for (let i = 0; i < b.length; i++) {
        newArray[i + offset] = b[i];
    }
    return newArray;
}


export function noop() {}
