import env from '../../core/env';
import { PropType } from '../../core/types';
import Path from '../Path'
import Displayable from '../Displayable';

// Fix weird bug in some version of IE11 (like 11.0.9600.178**),
// where exception "unexpected call to method or property access"
// might be thrown when calling ctx.fill or ctx.stroke after a path
// whose area size is zero is drawn and ctx.clip() is called and
// shadowBlur is set. See #4572, #3112, #5777.
// (e.g.,
//  ctx.moveTo(10, 10);
//  ctx.lineTo(20, 10);
//  ctx.closePath();
//  ctx.clip();
//  ctx.shadowBlur = 10;
//  ...
//  ctx.fill();
// )

const shadowTemp = [
    ['shadowBlur', 0],
    ['shadowColor', '#000'],
    ['shadowOffsetX', 0],
    ['shadowOffsetY', 0]
];

type BrushType = PropType<Path, 'brush'>

export default function (orignalBrush: BrushType) {

    // version string can be: '11.0'
    return (env.browser.ie && (env.browser.version as number) >= 11)

        ? function (ctx: CanvasRenderingContext2D, prevEl: Displayable) {
            const clipPaths = this.__clipPaths;
            const style = this.style;
            let modified;

            if (clipPaths) {
                for (let i = 0; i < clipPaths.length; i++) {
                    const clipPath = clipPaths[i];
                    const shape = clipPath && clipPath.shape;
                    const type = clipPath && clipPath.type;

                    if (shape && (
                        (type === 'sector' && shape.startAngle === shape.endAngle)
                        || (type === 'rect' && (!shape.width || !shape.height))
                    )) {
                        for (let j = 0; j < shadowTemp.length; j++) {
                            // It is save to put shadowTemp static, because shadowTemp
                            // will be all modified each item brush called.
                            shadowTemp[j][2] = style[shadowTemp[j][0]];
                            style[shadowTemp[j][0]] = shadowTemp[j][1];
                        }
                        modified = true;
                        break;
                    }
                }
            }

            orignalBrush.call(this, ctx, prevEl);

            if (modified) {
                for (let j = 0; j < shadowTemp.length; j++) {
                    style[shadowTemp[j][0]] = shadowTemp[j][2];
                }
            }
        }

        : orignalBrush;
}
