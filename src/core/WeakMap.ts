let wmUniqueIndex = 0;

export default class WeakMap<K extends object, V> {

    protected _id: string;

    constructor() {
        this._id = '__\0ec_wm_' + wmUniqueIndex++ + '_' + Math.random().toFixed(5);
    }

    get(key: K): V {
        return (this._guard(key) as any)[this._id];
    }

    set(key: K, value: V): WeakMap<K, V> {
        (this._guard(key) as any)[this._id] = value;
        return this;
    }

    delete(key: K): boolean {
        if (this.has(key)) {
            delete (this._guard(key) as any)[this._id];
            return true;
        }
        return false;
    }

    has(key: K): boolean {
        return (this._guard(key) as any)[this._id];
    }

    protected _guard(key: K): K {
        if (key !== Object(key)) {
            throw TypeError('Value of WeakMap is not a non-null object.');
        }
        return key;
    }
}
