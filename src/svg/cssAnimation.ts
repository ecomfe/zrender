import Transformable, { copyTransform, TRANSFORMABLE_PROPS } from '../core/Transformable';
import Displayable from '../graphic/Displayable';
import { SVGVNodeAttrs } from './core';
import { BrushScope } from './graphic';
import Path from '../graphic/Path';
import SVGPathRebuilder from './SVGPathRebuilder';
import PathProxy from '../core/PathProxy';
import { getPathPrecision, getSRTTransformString } from './helper';
import { extend, isString, keys } from '../core/util';
import Animator from '../animation/Animator';

export const EASING_MAP: Record<string, string> = {
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

function sameTransform(a: any, b: any) {
    for (let i = 0; i < TRANSFORMABLE_PROPS.length; i++) {
        const prop = TRANSFORMABLE_PROPS[i];
        if (a[prop] !== b[prop]) {
            return false;
        }
    }
    return true;
}

function buildPathString(el: Path, kfShape: Path['shape']) {
    const shape = extend({}, el.shape);
    extend(shape, kfShape);

    const path = new PathProxy();
    el.buildPath(path, shape);
    const svgPathBuilder = new SVGPathRebuilder();
    svgPathBuilder.reset(getPathPrecision(el));
    path.rebuildPath(svgPathBuilder, 1);
    svgPathBuilder.generateStr();
    return `path("${svgPathBuilder.getStr()}")`;
}

function col2str(rgba: number[]): string {
    rgba[0] = Math.floor(rgba[0]);
    rgba[1] = Math.floor(rgba[1]);
    rgba[2] = Math.floor(rgba[2]);

    return 'rgba(' + rgba.join(',') + ')';
}

function setTransformOrigin(target: Record<string, string>, transform: Transformable) {
    const {originX, originY} = transform;
    if (originX || originY) {
        target['transform-origin'] = `${originX}px ${originY}px`;
    }
}

export const ANIMATE_STYLE_MAP: Record<string, string> = {
    fill: 'fill',
    opacity: 'opacity',
    lineWidth: 'stroke-width',
    lineDashOffset: 'stroke-dashoffset'
    // TODO shadow is not supported.
};

export function createCSSAnimation(
    el: Displayable,
    attrs: SVGVNodeAttrs,
    scope: BrushScope
) {
    const animators = el.animators;
    const len = animators.length;
    if (!len) {
        return;
    }
    // Group animators by it's configuration
    const groupAnimators: Record<string, [string, Animator<any>[]]> = {};
    for (let i = 0; i < len; i++) {
        const animator = animators[i];
        const keyArr: (string | number)[] = [animator.getMaxTime() / 1000 + 's'];
        const easing = animator.getClip().easing;
        const delay = animator.getDelay();

        if (isString(easing) && EASING_MAP[easing]) {
            keyArr.push(`cubic-bezier(${EASING_MAP[easing]})`);
        }
        if (delay) {
            keyArr.push(delay / 1000 + 's');
        }
        if (animator.getLoop()) {
            keyArr.push('infinite');
        }
        const key = keyArr.join(' ');

        // TODO fill mode
        groupAnimators[key] = groupAnimators[key] || [key, [] as Animator<any>[]];
        groupAnimators[key][1].push(animator);
    }

    function createSingleCSSAnimation(groupAnimator: [string, Animator<any>[]]) {
        const animators = groupAnimator[1];
        const from: Record<string, string> = {};
        const to: Record<string, string> = {};
        const len = animators.length;

        // transformable props.
        let startTransform: Transformable;
        let endTransform: Transformable;

        let startShape;
        let endShape;

        // Find all transform animations.
        // TODO origin, parent
        for (let i = 0; i < len; i++) {
            const animator = animators[i];
            const targetProp = animator.targetName;
            if (!targetProp) {
                if (!startTransform) {
                    startTransform = {} as Transformable;
                    endTransform = {} as Transformable;
                    copyTransform(startTransform, el);
                    copyTransform(endTransform, el);
                }
                animator.saveTo(startTransform, null, true);
                animator.saveTo(endTransform, null, false);
            }
            else if (targetProp === 'shape') {
                startShape = startShape || {};
                endShape = endShape || {};
                animator.saveTo(startShape, null, true);
                animator.saveTo(endShape, null, false);
            }
        }
        if (startTransform
            && (
                !sameTransform(startTransform, el)
                || !sameTransform(endTransform, el)
            )) {
            from.transform = getSRTTransformString(startTransform);
            to.transform = getSRTTransformString(endTransform);
            setTransformOrigin(from, startTransform);
            setTransformOrigin(to, endTransform);
        }
        if (startShape) {
            from.d = buildPathString(el as Path, startShape);
            to.d = buildPathString(el as Path, endShape);
        }

        for (let i = 0; i < len; i++) {
            const animator = animators[i];
            const targetProp = animator.targetName;
            if (targetProp === 'style') {
                const tracks = animator.getTracks();
                for (let k = 0; k < tracks.length; k++) {
                    const track = tracks[k];
                    const propName = track.propName;
                    const attrName = ANIMATE_STYLE_MAP[propName];
                    if (attrName && track.needsAnimate()) {
                        const kfs = track.keyframes;
                        let val0 = kfs[0].value;
                        let valn = kfs[kfs.length - 1].value;
                        const isColor = track.isValueColor;
                        from[attrName] = isColor ? col2str(val0 as number[]) : val0 as string;
                        to[attrName] = isColor ? col2str(valn as number[]) : val0 as string;
                    }
                }
            }
        }
        if (keys(from).length) {
            const animationName = 'zr-ani-' + scope.cssAnimIdx++;
            scope.cssAnims[animationName] = { '0%': from, '100%': to};
            // eslint-disable-next-line
            for (let attrName in from) {
                // Remove the attrs in the element because it will be set by animation.
                // Reduce the size.
                attrs[attrName] = false;
            }
            // animationName {duration easing delay loop} fillMode
            return `${animationName} ${groupAnimator[0]} both`;
        }
    }

    const cssAnimations: string[] = [];
    // eslint-disable-next-line
    for (let key in groupAnimators) {
        const animationCfg = createSingleCSSAnimation(groupAnimators[key]);
        if (animationCfg) {
            cssAnimations.push(animationCfg);
        }
    }

    if (cssAnimations.length) {
        const className = 'zr-cls-' + scope.cssClassIdx++;
        scope.cssNodes['.' + className] = {
            animation: cssAnimations.join(',')
        };
        // TODO exists class?
        attrs.class = className;
    }
}