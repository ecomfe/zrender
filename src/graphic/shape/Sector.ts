import Path, { PathProps } from '../Path';
import * as roundSectorHelper from '../helper/roundSector';
import {calculateTextPosition, TextPositionCalculationResult} from '../../contain/text';
import {RectLike} from '../../core/BoundingRect';
import {BuiltinTextPosition, TextAlign, TextVerticalAlign} from '../../core/types';
import {ElementTextConfig} from '../../Element';

type SectorTextPosition = BuiltinTextPosition
    | 'start' | 'end'
    | 'startTop' | 'insideStartTop' | 'insideStart' | 'insideStartBottom' | 'startBottom'
    | 'middleTop' | 'insideMiddleTop' | 'middle' | 'insideMiddleBottom' | 'middleBottom'
    | 'endTop' | 'insideEndTop' | 'insideEnd' | 'insideEndBottom' | 'endBottom';

export class SectorShape {
    cx = 0
    cy = 0
    r0 = 0
    r = 0
    startAngle = 0
    endAngle = Math.PI * 2
    clockwise = true
    cornerRadius = 0
    innerCornerRadius = 0
}

export interface SectorProps extends PathProps {
    shape?: Partial<SectorShape>
}

class Sector extends Path<SectorProps> {

    shape: SectorShape

    constructor(opts?: SectorProps) {
        super(opts);
    }

    getDefaultShape() {
        return new SectorShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: SectorShape) {
        roundSectorHelper.buildPath(ctx, shape)
    }

    isZeroArea() {
        return this.shape.startAngle === this.shape.endAngle
            || this.shape.r === this.shape.r0;
    }

    calculateTextPosition = (
        out: TextPositionCalculationResult,
        opts: {
            position?: SectorTextPosition | (number | string)[]
            distance?: number   // Default 5
            global?: boolean
        },
        rect: RectLike
    ) => {
        const textPosition = opts.position;

        if (!textPosition || textPosition instanceof Array) {
            return calculateTextPosition(out, opts as ElementTextConfig, rect);
        }

        const distance = opts.distance != null ? opts.distance : 5;

        const cx = this.shape.cx;
        const cy = this.shape.cy;
        const r = this.shape.r;
        const r0 = this.shape.r0;
        const middleR = (r + r0) / 2;
        const startAngle = this.shape.startAngle;
        const endAngle = this.shape.endAngle;
        const middleAngle = (startAngle + endAngle) / 2;

        // base position: top-left
        let x = cx + r * Math.cos(startAngle);
        let y = cy + r * Math.sin(startAngle);

        let textAlign: TextAlign = 'left';
        let textVerticalAlign: TextVerticalAlign = 'top';

        switch (textPosition) {
            case 'start':
                x = cx + middleR * Math.cos(startAngle);
                y = cy + middleR * Math.sin(startAngle);
                textAlign = 'right';
                textVerticalAlign = 'middle';
                break;
            case 'end':
                x = cx + middleR * Math.cos(endAngle);
                y = cy + middleR * Math.sin(endAngle);
                textAlign = 'left';
                textVerticalAlign = 'middle';
                break;

            case 'startTop':
                x = cx + (r + distance) * Math.cos(startAngle);
                y = cy + (r + distance) * Math.sin(startAngle);
                textAlign = 'left';
                textVerticalAlign = 'bottom';
                break;
            case 'insideStartTop':
                x = cx + (r - distance) * Math.cos(startAngle);
                y = cy + (r - distance) * Math.sin(startAngle);
                textAlign = 'left';
                textVerticalAlign = 'top';
                break;
            case 'insideStart':
                x = cx + middleR * Math.cos(startAngle);
                y = cy + middleR * Math.sin(startAngle);
                textAlign = 'left';
                textVerticalAlign = 'middle';
                break;
            case 'insideStartBottom':
                x = cx + (r0 + distance) * Math.cos(startAngle);
                y = cy + (r0 + distance) * Math.sin(startAngle);
                textAlign = 'left';
                textVerticalAlign = 'bottom';
                break;
            case 'startBottom':
                x = cx + (r0 - distance) * Math.cos(startAngle);
                y = cy + (r0 - distance) * Math.sin(startAngle);
                textAlign = 'left';
                textVerticalAlign = 'top';
                break;

            case 'middleTop':
                x = cx + (r + distance) * Math.cos(middleAngle);
                y = cy + (r + distance) * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'bottom';
                break;
            case 'insideMiddleTop':
                x = cx + (r - distance) * Math.cos(middleAngle);
                y = cy + (r - distance) * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'top';
                break;
            case 'middle':
                x = cx + middleR * Math.cos(middleAngle);
                y = cy + middleR * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'middle';
                break;
            case 'insideMiddleBottom':
                x = cx + (r0 + distance) * Math.cos(middleAngle);
                y = cy + r0 * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'bottom';
                break;
            case 'middleBottom':
                x = cx + (r0 - distance) * Math.cos(middleAngle);
                y = cy + (r0 - distance) * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'top';
                break;

            case 'endTop':
                x = cx + (r + distance) * Math.cos(endAngle);
                y = cy + (r + distance) * Math.sin(endAngle);
                textAlign = 'left';
                textVerticalAlign = 'bottom';
            case 'insideEndTop':
                x = cx + (r - distance) * Math.cos(endAngle);
                y = cy + (r - distance) * Math.sin(endAngle);
                textAlign = 'left';
                textVerticalAlign = 'top';
                break;
            case 'insideEnd':
                x = cx + middleR * Math.cos(endAngle);
                y = cy + middleR * Math.sin(endAngle);
                textAlign = 'left';
                textVerticalAlign = 'middle';
                break;
            case 'insideEndBottom':
                x = cx + (r0 + distance) * Math.cos(endAngle);
                y = cy + (r0 + distance) * Math.sin(endAngle);
                textAlign = 'left';
                textVerticalAlign = 'bottom';
                break;
            case 'endBottom':
                x = cx + (r0 - distance) * Math.cos(endAngle);
                y = cy + (r0 - distance) * Math.sin(endAngle);
                textAlign = 'right';
                textVerticalAlign = 'top';
                break;
            default:
                return calculateTextPosition(out, opts as ElementTextConfig, rect);
        }

        out = out || {} as TextPositionCalculationResult;
        out.x = x;
        out.y = y;
        out.align = textAlign;
        out.verticalAlign = textVerticalAlign;

        return out;
    }
}

Sector.prototype.type = 'sector';

export default Sector;
