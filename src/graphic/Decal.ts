import {ImageLike} from '../core/types';

export type DecalDashArray = number | (number | number[])[];

export interface DecalObject {
    // 'image', 'triangle', 'diamond', 'pin', 'arrow', 'line', 'rect', 'roundRect', 'square', 'circle'
    shape?: string
    image?: ImageLike | string

    // size relative to the dash bounding box; valued from 0 to 1
    symbolSize?: number
    // keep the aspect ratio and use the smaller one of width and height as bounding box size
    symbolKeepAspect?: boolean

    // foreground color of the pattern
    color?: string
    // background color of the pattern; default value is 'none' (same as 'transparent') so that the underlying series color is displayed
    backgroundColor?: string

    // dash-gap pattern on x
    dashArrayX?: DecalDashArray
    // dash-gap pattern on y
    dashArrayY?: DecalDashArray
    // offset of the starting x
    dashOffsetX?: number
    // offset of the starting y
    dashOffsetY?: number
    // extra offset of each row
    dashLineOffsetX?: number
    // extra offset of each column
    dashLineOffsetY?: number

    // in radians; valued from -Math.PI to Math.PI
    rotation?: number
}

class Decal {
    shape: string
    image: ImageLike | string

    symbolSize: number
    symbolKeepAspect: boolean

    color: string
    backgroundColor: string

    dashArrayX: DecalDashArray
    dashArrayY: DecalDashArray
    dashOffsetX: number
    dashOffsetY: number

    rotation: number

    constructor(decalObject: DecalObject) {
        decalObject = decalObject || {};
    }
}

export default Decal;
