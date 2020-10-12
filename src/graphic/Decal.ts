import {ImageLike} from '../core/types';
import Pattern from './Pattern';

export type DecalDashArrayX = number | (number | number[])[];
export type DecalDashArrayY = number | number[];

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
    dashArrayX?: DecalDashArrayX
    // dash-gap pattern on y
    dashArrayY?: DecalDashArrayY
    // extra offset of each row
    dashLineOffset?: number

    // in radians; valued from -Math.PI to Math.PI
    rotation?: number,

    // boundary of largest tile width
    maxTileWidth?: number,
    // boundary of largest tile height
    maxTileHeight?: number
}

class Decal {
    shape: string
    image: ImageLike | string

    symbolSize: number
    symbolKeepAspect: boolean

    color: string
    backgroundColor: string

    dashArrayX: DecalDashArrayX
    dashArrayY: DecalDashArrayY
    dashLineOffset: number

    rotation: number

    maxTileWidth: number
    maxTileHeight: number

    pattern: Pattern
    canvasPattern: CanvasPattern

    constructor(decalObject: DecalObject) {
        decalObject = decalObject || {};
    }
}

export default Decal;
