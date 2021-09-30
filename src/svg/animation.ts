import { createVNode, SVGVNode } from './core';
import Displayable from '../graphic/Displayable';
import {TransformProp} from '../core/Transformable';
import Animator, { AnimatorTrack } from '../animation/Animator';
import Path from '../graphic/Path';
import SVGPathRebuilder from './SVGPathRebuilder';
import PathProxy from '../core/PathProxy';
import { extend, isString } from '../core/util';

function col2str(rgba: number[]): string {
    rgba[0] = Math.floor(rgba[0]);
    rgba[1] = Math.floor(rgba[1]);
    rgba[2] = Math.floor(rgba[2]);

    return 'rgba(' + rgba.join(',') + ')';
}

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
    return hasTrack ? `${from.join(' ')};${to.join(' ')}` : '';
}


type SVGTransformType = 'translate' | 'scale' | 'rotate';

function createAnimateTransformVNode(transformType: SVGTransformType, values: string) {
    return createVNode('animateTransform', '', {
        attributeName: 'transform',
        attributeType: 'XML',
        type: transformType,
        additive: 'sum',
        values: values
    });
}

const transformMaps: [SVGTransformType, TransformProp[]][] = [
    ['translate', ['x', 'y']],
    ['rotate', ['rotation', 'originX', 'originY']],
    ['scale', ['scaleX', 'scaleY']]
];

function buildPathString(el: Path, kfShape: Path['shape']) {
    const shape = extend({}, el.shape);
    extend(shape, kfShape);

    const path = new PathProxy();
    el.buildPath(path, shape);
    const svgPathBuilder = new SVGPathRebuilder();
    svgPathBuilder.reset();
    path.rebuildPath(svgPathBuilder, 1);
    svgPathBuilder.generateStr();
    return svgPathBuilder.getStr();
}

const ANIMATE_STYLE_MAP: Record<string, string> = {
    fill: 'fill',
    opacity: 'opacity',
    lineWidth: 'stroke-width',
    lineDashOffset: 'stroke-dashoffset'
    // TODO shadow is not supported.
};

function createAnimateVNodeFromTrack(track: AnimatorTrack) {
    const propName = track.propName;
    const attrName = ANIMATE_STYLE_MAP[propName];
    if (attrName && track.needsAnimate()) {
        const kfs = track.keyframes;
        let val0 = kfs[0].value;
        let valn = kfs[kfs.length - 1].value;
        const isColor = track.isValueColor;

        return createVNode('animate', '', {
            attributeName: attrName,
            values: `${isColor ? col2str(val0 as number[]) : val0};${isColor ? col2str(valn as number[]) : valn}`
        });
    }
}

const easingMap: Record<string, string> = {
    // From https://easings.net/
    cubicIn: '0.32,0,0.67,0',
    cubicOut: '0.33,1,0.68,1',
    cubicInOut: '0.65,0,0.35,1',
    quadraticIn: '0.11,0,0.5,0',
    quadraticOut: '0.5,1,0.89,1',
    quadraticInOut: '0.45,0,0.55,1',
    quarticIn: '0.5,0,0.75,0',
    quarticOut: '0.25,1,0.5,1',
    quarticInOut: '0.76,0,0.24,1',
    quinticIn: '0.64,0,0.78,0',
    quinticOut: '0.22,1,0.36,1',
    quinticInOut: '0.83,0,0.17,1',
    sinusoidalIn: '0.12,0,0.39,0',
    sinusoidalOut: '0.61,1,0.88,1',
    sinusoidalInOut: '0.37,0,0.63,1',
    exponentialIn: '0.7,0,0.84,0',
    exponentialOut: '0.16,1,0.3,1',
    exponentialInOut: '0.87,0,0.13,1',
    circularIn: '0.55,0,1,0.45',
    circularOut: '0,0.55,0.45,1',
    circularInOut: '0.85,0,0.15,1'
    // TODO elastic, bounce
};

function applyCommonAttrs(animateVNode: SVGVNode, animator: Animator<any>) {
    const attrs = animateVNode.attrs;
    const easing = animator.getClip().easing;
    const delay = animator.getDelay();

    if (animator.getLoop()) {
        attrs.repeatCount = 'indefinite';
    }
    attrs.dur = animator.getMaxTime() / 1000 + 's';

    if (delay > 0) {
        attrs.begin = delay / 1000 + 's';
    }
    if (isString(easing) && easingMap[easing]) {
        attrs.calcMode = 'spline';
        attrs.keySplines = easingMap[easing];
    }

    attrs.fill = 'freeze';
}

export function createAnimates(el: Displayable, defs: Record<string, SVGVNode>): SVGVNode[] {
    const animators = el.animators;
    let animateVNodes = [];

    for (let i = 0; i < animators.length; i++) {
        const animator = animators[i];
        const targetProp = animator.targetName;
        if (!targetProp) {
            // transformable props.
            // TODO origin, parent, skew
            // TODO parents transform animations.
            for (let k = 0; k < transformMaps.length; k++) {
                const map = transformMaps[k];
                const transformType = map[0];
                const val = getTransformAnimateValues(el, animator, map[1], transformType);
                if (val) {
                    const animateVNode = createAnimateTransformVNode(transformType, val);
                    if (animateVNode) {
                        applyCommonAttrs(animateVNode, animator);
                        animateVNodes.push(animateVNode);
                    }
                }
            }
        }
        else if (targetProp === 'shape') {
            const startShape = {};
            const endShape = {};
            animator.saveToTarget(startShape, null, true);
            animator.saveToTarget(endShape, null, false);

            const animateVNode = createVNode('animate', '', {
                attributeName: 'd',
                values: buildPathString(el as Path, startShape) + ';' + buildPathString(el as Path, endShape)
            });

            applyCommonAttrs(animateVNode, animator);
            animateVNodes.push(animateVNode);
        }
        else if (targetProp === 'style') {
            const tracks = animator.getTracks();
            for (let k = 0; k < tracks.length; k++) {
                const track = tracks[k];
                const animateVNode = createAnimateVNodeFromTrack(track);
                if (animateVNode) {
                    applyCommonAttrs(animateVNode, animator);
                    animateVNodes.push(animateVNode);
                }
            }
        }
    }
    return animateVNodes;
}

export function hasShapeAnimation(el: Displayable) {
    const animators = el.animators;
    for (let i = 0; i < animators.length; i++) {
        if (animators[i].targetName === 'shape') {
            return true;
        }
    }
    return false;
}
