import { createElement, SVGElDef } from './core';
import Displayable from '../graphic/Displayable';
import {TransformProp} from '../core/Transformable';
import Animator from '../animation/Animator';

function getTransformAnimateValues(
    el: Displayable,
    animator: Animator<Displayable>,
    props: TransformProp[],
    svgPropName: string
) {
    const from: number[] = [];
    const to: number[] = [];
    let hasTrack = false;
    for (let i = 0; i < props.length; i++) {
        const track = animator.getTrack(props[i]);
        if (track && track.needsAnimate()) {
            // TODO: Only support two keyframes now
            const keyframes = track.keyframes;
            const kf0 = keyframes[0];
            const kfn = keyframes[keyframes.length - 1];
            from[i] = kf0.value as number;
            to[i] = kfn.value as number;
            hasTrack = true;
        }
        else {
            from[i] = to[i] = el[props[i]];
        }
    }
    return hasTrack ? `${from}.join(' ');${to}.join(' ')` : '';
}


type SVGTransformType = 'translate' | 'scale' | 'rotate';

function createTransformAnimateDef(defs: Record<string, SVGElDef>, transformType: SVGTransformType) {
    const id = transformType.substr(0, 3);
    if (defs[id]) {
        return id;
    }

    const el = createElement('animateTransform', [
        ['attributeName', 'transform'],
        ['attributeType', 'XML'],
        ['type', transformType],
        ['additive', 'sum']
    ]);
    defs[id] = el;
    return id;
}

function createAnimateEl(useId: string, values: string) {
    return createElement('use', [
        ['xlink:href', useId],
        ['values', values]
    ]);
}

const transformMaps: [SVGTransformType, TransformProp[]][] = [
    ['translate', ['x', 'y']],
    ['rotate', ['rotation', 'originX', 'originY']],
    ['scale', ['scaleX', 'scaleY']]
];

export function createAnimates(el: Displayable, defs: Record<string, SVGElDef>): SVGElDef[] {
    const animators = el.animators;
    let animatesEls = [];

    for (let i = 0; i < animators.length; i++) {
        const animator = animators[i];
        const targetProp = animator.targetName;
        if (!targetProp) {
            // transformable props.
            // TODO origin, parent, skew
            for (let k = 0; k < transformMaps.length; k++) {
                const map = transformMaps[k];
                const transformType = map[0];
                const val = getTransformAnimateValues(el, animator, map[1], transformType);
                if (val) {
                    animatesEls.push(
                        createAnimateEl(
                            createTransformAnimateDef(defs, 'translate'),
                            val
                        )
                    );
                }
            }
        }
        else if (targetProp === 'shape') {

        }
        else if (targetProp === 'style') {

        }
    }
    return;
}
