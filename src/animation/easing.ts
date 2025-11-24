/**
 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
 * @see http://sole.github.io/tween.js/examples/03_graphs.html
 * @exports zrender/animation/easing
 */

import { PI_OVER_2, PI2, PI, mathCos, mathSin, mathPow, mathSqrt, mathASin } from '../core/math';

type easingFunc = (percent: number) => number;

export type AnimationEasing = keyof typeof easingFuncs | easingFunc;

const easingFuncs = {
    /**
    * @param {number} k
    * @return {number}
    */
    linear(k: number) {
        return k;
    },

    /**
    * @param {number} k
    * @return {number}
    */
    quadraticIn(k: number) {
        return k * k;
    },
    /**
    * @param {number} k
    * @return {number}
    */
    quadraticOut(k: number) {
        return k * (2 - k);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    quadraticInOut(k: number) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k;
        }
        return -0.5 * (--k * (k - 2) - 1);
    },

    // 三次方的缓动（t^3）
    /**
    * @param {number} k
    * @return {number}
    */
    cubicIn(k: number) {
        return k * k * k;
    },
    /**
    * @param {number} k
    * @return {number}
    */
    cubicOut(k: number) {
        return --k * k * k + 1;
    },
    /**
    * @param {number} k
    * @return {number}
    */
    cubicInOut(k: number) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k + 2);
    },

    // 四次方的缓动（t^4）
    /**
    * @param {number} k
    * @return {number}
    */
    quarticIn(k: number) {
        return k * k * k * k;
    },
    /**
    * @param {number} k
    * @return {number}
    */
    quarticOut(k: number) {
        return 1 - (--k * k * k * k);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    quarticInOut(k: number) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k;
        }
        return -0.5 * ((k -= 2) * k * k * k - 2);
    },

    // 五次方的缓动（t^5）
    /**
    * @param {number} k
    * @return {number}
    */
    quinticIn(k: number) {
        return k * k * k * k * k;
    },
    /**
    * @param {number} k
    * @return {number}
    */
    quinticOut(k: number) {
        return --k * k * k * k * k + 1;
    },
    /**
    * @param {number} k
    * @return {number}
    */
    quinticInOut(k: number) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k * k * k + 2);
    },

    // 正弦曲线的缓动（sin(t)）
    /**
    * @param {number} k
    * @return {number}
    */
    sinusoidalIn(k: number) {
        return 1 - mathCos(k * PI_OVER_2);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    sinusoidalOut(k: number) {
        return mathSin(k * PI_OVER_2);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    sinusoidalInOut(k: number) {
        return 0.5 * (1 - mathCos(PI * k));
    },

    // 指数曲线的缓动（2^t）
    /**
    * @param {number} k
    * @return {number}
    */
    exponentialIn(k: number) {
        return k === 0 ? 0 : mathPow(1024, k - 1);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    exponentialOut(k: number) {
        return k === 1 ? 1 : 1 - mathPow(2, -10 * k);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    exponentialInOut(k: number) {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if ((k *= 2) < 1) {
            return 0.5 * mathPow(1024, k - 1);
        }
        return 0.5 * (-mathPow(2, -10 * (k - 1)) + 2);
    },

    // 圆形曲线的缓动（sqrt(1-t^2)）
    /**
    * @param {number} k
    * @return {number}
    */
    circularIn(k: number) {
        return 1 - mathSqrt(1 - k * k);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    circularOut(k: number) {
        return mathSqrt(1 - (--k * k));
    },
    /**
    * @param {number} k
    * @return {number}
    */
    circularInOut(k: number) {
        if ((k *= 2) < 1) {
            return -0.5 * (mathSqrt(1 - k * k) - 1);
        }
        return 0.5 * (mathSqrt(1 - (k -= 2) * k) + 1);
    },

    // 创建类似于弹簧在停止前来回振荡的动画
    /**
    * @param {number} k
    * @return {number}
    */
    elasticIn(k: number) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        }
        else {
            s = p * mathASin(1 / a) / PI2;
        }
        return -(a * mathPow(2, 10 * (k -= 1))
                    * mathSin((k - s) * PI2 / p));
    },
    /**
    * @param {number} k
    * @return {number}
    */
    elasticOut(k: number) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        }
        else {
            s = p * mathASin(1 / a) / PI2;
        }
        return (a * mathPow(2, -10 * k)
                    * mathSin((k - s) * PI2 / p) + 1);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    elasticInOut(k: number) {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        let s;
        let a = 0.1;
        const p = 0.4;
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        }
        else {
            s = p * mathASin(1 / a) / PI2;
        }
        if ((k *= 2) < 1) {
            return -0.5 * (a * mathPow(2, 10 * (k -= 1))
                * mathSin((k - s) * PI2 / p));
        }
        return a * mathPow(2, -10 * (k -= 1))
                * mathSin((k - s) * PI2 / p) * 0.5 + 1;

    },

    // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
    /**
    * @param {number} k
    * @return {number}
    */
    backIn(k: number) {
        const s = 1.70158;
        return k * k * ((s + 1) * k - s);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    backOut(k: number) {
        const s = 1.70158;
        return --k * k * ((s + 1) * k + s) + 1;
    },
    /**
    * @param {number} k
    * @return {number}
    */
    backInOut(k: number) {
        const s = 1.70158 * 1.525;
        if ((k *= 2) < 1) {
            return 0.5 * (k * k * ((s + 1) * k - s));
        }
        return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
    },

    // 创建弹跳效果
    /**
    * @param {number} k
    * @return {number}
    */
    bounceIn(k: number) {
        return 1 - easingFuncs.bounceOut(1 - k);
    },
    /**
    * @param {number} k
    * @return {number}
    */
    bounceOut(k: number) {
        if (k < (1 / 2.75)) {
            return 7.5625 * k * k;
        }
        else if (k < (2 / 2.75)) {
            return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
        }
        else if (k < (2.5 / 2.75)) {
            return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
        }
        else {
            return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
        }
    },
    /**
    * @param {number} k
    * @return {number}
    */
    bounceInOut(k: number) {
        if (k < 0.5) {
            return easingFuncs.bounceIn(k * 2) * 0.5;
        }
        return easingFuncs.bounceOut(k * 2 - 1) * 0.5 + 0.5;
    }
};


export default easingFuncs;