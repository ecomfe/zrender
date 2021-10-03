import { createVNode, SVGVNode } from './core';
import Displayable from '../graphic/Displayable';
import {TransformProp} from '../core/Transformable';
import Animator, { AnimatorTrack } from '../animation/Animator';
import Path from '../graphic/Path';
import SVGPathRebuilder from './SVGPathRebuilder';
import PathProxy from '../core/PathProxy';
import { extend, isString } from '../core/util';
import { getPathPrecision } from './helper';
import { ANIMATE_STYLE_MAP, EASING_MAP } from './cssAnimation';

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
    svgPathBuilder.reset(getPathPrecision(el));
    path.rebuildPath(svgPathBuilder, 1);
    svgPathBuilder.generateStr();
    return svgPathBuilder.getStr();
}

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
    if (isString(easing) && EASING_MAP[easing]) {
        attrs.calcMode = 'spline';
        attrs.keySplines = EASING_MAP[easing];
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
            animator.saveTo(startShape, null, true);
            animator.saveTo(endShape, null, false);

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

