export type Dictionary<T> = {
    [key: string]: T
}

/**
 * Not readonly ArrayLike
 * Include Array, TypedArray
 */
export type ArrayLike<T> = {
    [key: number]: T
    length: number
}

export type ImageLike = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement

export type TextVerticalAlign = 'top' | 'middle' | 'bottom'
    | 'center' // DEPRECATED

// TODO: Have not support 'start', 'end' yet.
export type TextAlign = 'left' | 'center' | 'right'
    | 'middle' // DEPRECATED

export type WXCanvasRenderingContext = CanvasRenderingContext2D & {
    draw: () => void
};

export type ZRCanvasRenderingContext = CanvasRenderingContext2D & {
    dpr: number
    __attrCachedBy: boolean | number
}

// Properties zrender will extended to the raw event
type ZREventProperties = {
    zrX: number
    zrY: number
    zrDelta: number

    zrEventControl: 'no_globalout' | 'only_globalout'
    zrIsToLocalDOM: boolean

    zrByTouch: boolean
}

export type ZRRawMouseEvent = MouseEvent & ZREventProperties
export type ZRRawTouchEvent = TouchEvent & ZREventProperties
export type ZRRawPointerEvent = TouchEvent & ZREventProperties

export type ZRRawEvent = ZRRawMouseEvent & ZRRawTouchEvent & ZRRawPointerEvent

export type ZRPinchEvent = ZRRawEvent & {
    pinchScale: number
    pinchX: number
    pinchY: number
    gestureEvent: string
}

export type ElementEventName = 'click' | 'dblclick' | 'mousewheel' | 'mouseout' |
    'mouseover' | 'mouseup' | 'mousedown' | 'mousemove' | 'contextmenu' |
    'drag' | 'dragstart' | 'dragend' | 'dragenter' | 'dragleave' | 'dragover' | 'drop';

export type ElementEventNameWithOn = 'onclick' | 'ondblclick' | 'onmousewheel' | 'onmouseout' |
    'onmouseup' | 'onmousedown' | 'onmousemove' | 'oncontextmenu' |
    'ondrag' | 'ondragstart' | 'ondragend' | 'ondragenter' | 'ondragleave' | 'ondragover' | 'ondrop';



// Useful type methods
export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type AllPropTypes<T> = PropType<T, keyof T>

export type FunctionPropertyNames<T> = {[K in keyof T]: T[K] extends Function ? K : never}[keyof T];
