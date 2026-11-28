import env from '../../core/env';
import { createObject, hasOwn } from '../../core/util';

/**
 * @tutorial [ZR_STYLE_OBJECT]:
 *  zrender style uses prototype for optimization.
 *  A zrender style object can only be created via `createObject(createStyleProto(defaultStyle), customizedStyle)`,
 *  which mitigates the effects of prototype pollution in affected environments.
 *  NOTE:
 *    - `_mergeStyle` typically does not clone props on `__proto__`.
 *    - State changing usually passes a style object to `useStyle`.
 *  The typical pattern of style object creation:
 *  ```js
 *  export const DEFAULT_STYLE = {border: 1, color: 'red'};
 *  const DEFAULT_STYLE_PROTO = createStyleProto(DEFAULT_STYLE);
 *  export class SomeElement extends Displayable {
 *      createStyle(obj) {
 *          return createObject(DEFAULT_STYLE_PROTO, obj);
 *      }
 *      useStyle(obj) {
 *          this.style = isStyleObject(obj) ? obj : this.createStyle(obj);
 *      }
 *  }
 *  ```
 */

const STYLE_MAGIC_KEY = '__zrstl' + Math.round((Math.random() * 10));

export function createStyleProto(props: object): object {
    const styleProto = createObject(null, props);
    setStyleMagicKey(styleProto);
    return styleProto;
}

let setStyleMagicKey = function (styleProto: object): void {
    // `enumerable` is `false` by default, which prevents `STYLE_MAGIC_KEY`
    // from being visited via `for in`.
    Object.defineProperty(styleProto, STYLE_MAGIC_KEY, {value: 1});
};
export let isStyleObject = function (style: object): boolean {
    return !!(style as any)[STYLE_MAGIC_KEY];
};

// TODO: conditionally import this code.
if (!env.defPropSupported) {
    setStyleMagicKey = function (styleProto: object): void {
        (styleProto as any)[STYLE_MAGIC_KEY] = 1;
    };
    isStyleObject = function (style: object): boolean {
        return !!(style as any)[STYLE_MAGIC_KEY] && !hasOwn(style, STYLE_MAGIC_KEY);
    };
}

/**
 * @see ZR_STYLE_OBJECT
 */
export function zrStyleHas(style: object, prop: string): boolean {
    return prop in style;
}
