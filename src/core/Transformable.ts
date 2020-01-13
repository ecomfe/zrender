import * as matrix from './matrix';
import * as vector from './vector';
import Eventful from './Eventful';
import { ZRCanvasRenderingContext } from './types';

var mIdentity = matrix.identity;

var EPSILON = 5e-5;

function isNotAroundZero(val: number) {
    return val > EPSILON || val < -EPSILON;
}

var scaleTmp: vector.VectorArray = [];
var tmpTransform: matrix.MatrixArray = [];
var originTransform = matrix.create();

class Transformable extends Eventful {

    parent: Transformable

    position: vector.VectorArray
    rotation: number
    scale: vector.VectorArray
    /**
     * 旋转和缩放的原点
     */
    origin: vector.VectorArray
    /**
     * Scale ratio
     */
    globalScaleRatio = 1


    transform: matrix.MatrixArray
    invTransform: matrix.MatrixArray

    constructor(opts?: {
        position?: vector.VectorArray
        rotation?: number
        scale?: vector.VectorArray
        origin?: vector.VectorArray
    }) {
        super();

        opts = opts || {};
        // If there are no given position, rotation, scale
        this.position = opts.position || [0, 0];
        this.rotation = opts.rotation || 0;
        this.scale = opts.scale || [1, 1];

        /**
         * 旋转和缩放的原点
         */
        this.origin = opts.origin || null;
    }

    /**
     * 判断是否需要有坐标变换
     * 如果有坐标变换, 则从position, rotation, scale以及父节点的transform计算出自身的transform矩阵
     */
    needLocalTransform(): boolean {
        return isNotAroundZero(this.rotation)
            || isNotAroundZero(this.position[0])
            || isNotAroundZero(this.position[1])
            || isNotAroundZero(this.scale[0] - 1)
            || isNotAroundZero(this.scale[1] - 1);
    }

    updateTransform() {
        const parent = this.parent;
        const parentHasTransform = parent && parent.transform;
        const needLocalTransform = this.needLocalTransform();

        let m = this.transform;
        if (!(needLocalTransform || parentHasTransform)) {
            m && mIdentity(m);
            return;
        }

        m = m || matrix.create();

        if (needLocalTransform) {
            this.getLocalTransform(m);
        }
        else {
            mIdentity(m);
        }

        // 应用父节点变换
        if (parentHasTransform) {
            if (needLocalTransform) {
                matrix.mul(m, parent.transform, m);
            }
            else {
                matrix.copy(m, parent.transform);
            }
        }
        // 保存这个变换矩阵
        this.transform = m;

        const globalScaleRatio = this.globalScaleRatio;
        if (globalScaleRatio != null && globalScaleRatio !== 1) {
            this.getGlobalScale(scaleTmp);
            const relX = scaleTmp[0] < 0 ? -1 : 1;
            const relY = scaleTmp[1] < 0 ? -1 : 1;
            const sx = ((scaleTmp[0] - relX) * globalScaleRatio + relX) / scaleTmp[0] || 0;
            const sy = ((scaleTmp[1] - relY) * globalScaleRatio + relY) / scaleTmp[1] || 0;

            m[0] *= sx;
            m[1] *= sx;
            m[2] *= sy;
            m[3] *= sy;
        }

        this.invTransform = this.invTransform || matrix.create();
        matrix.invert(this.invTransform, m);
    }

    getLocalTransform(m: matrix.MatrixArray) {
        return Transformable.getLocalTransform(this, m);
    }

    /**
     * 将自己的transform应用到context上
     * @param {CanvasRenderingContext2D} ctx
     */
    setTransform(ctx: CanvasRenderingContext2D) {
        const m = this.transform;
        const dpr = (ctx as ZRCanvasRenderingContext).dpr || 1;
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        }
        else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    restoreTransform(ctx: CanvasRenderingContext2D) {
        const dpr = (ctx as ZRCanvasRenderingContext).dpr || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    setLocalTransform(m: vector.VectorArray) {
        if (!m) {
            // TODO return or set identity?
            return;
        }
        const position = this.position;
        const scale = this.scale;
        let sx = m[0] * m[0] + m[1] * m[1];
        let sy = m[2] * m[2] + m[3] * m[3];
        if (isNotAroundZero(sx - 1)) {
            sx = Math.sqrt(sx);
        }
        if (isNotAroundZero(sy - 1)) {
            sy = Math.sqrt(sy);
        }
        if (m[0] < 0) {
            sx = -sx;
        }
        if (m[3] < 0) {
            sy = -sy;
        }

        position[0] = m[4];
        position[1] = m[5];
        scale[0] = sx;
        scale[1] = sy;
        this.rotation = Math.atan2(-m[1] / sy, m[0] / sx);
    }
    /**
     * 分解`transform`矩阵到`position`, `rotation`, `scale`
     */
    decomposeTransform() {
        if (!this.transform) {
            return;
        }
        const parent = this.parent;
        let m = this.transform;
        if (parent && parent.transform) {
            // Get local transform and decompose them to position, scale, rotation
            matrix.mul(tmpTransform, parent.invTransform, m);
            m = tmpTransform;
        }
        const origin = this.origin;
        if (origin && (origin[0] || origin[1])) {
            originTransform[4] = origin[0];
            originTransform[5] = origin[1];
            matrix.mul(tmpTransform, m, originTransform);
            tmpTransform[4] -= origin[0];
            tmpTransform[5] -= origin[1];
            m = tmpTransform;
        }

        this.setLocalTransform(m);
    }

    /**
     * Get global scale
     */
    getGlobalScale(out?: vector.VectorArray): vector.VectorArray {
        const m = this.transform;
        out = out || [];
        if (!m) {
            out[0] = 1;
            out[1] = 1;
            return out;
        }
        out[0] = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
        out[1] = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
        if (m[0] < 0) {
            out[0] = -out[0];
        }
        if (m[3] < 0) {
            out[1] = -out[1];
        }
        return out;
    }
    /**
     * 变换坐标位置到 shape 的局部坐标空间
     */
    transformCoordToLocal(x: number, y: number): vector.VectorArray {
        const v2 = [x, y];
        const invTransform = this.invTransform;
        if (invTransform) {
            vector.applyTransform(v2, v2, invTransform);
        }
        return v2;
    }

    /**
     * 变换局部坐标位置到全局坐标空间
     */
    transformCoordToGlobal(x: number, y: number): vector.VectorArray {
        const v2 = [x, y];
        const transform = this.transform;
        if (transform) {
            vector.applyTransform(v2, v2, transform);
        }
        return v2;
    }

    static getLocalTransform(target: Transformable, m?: matrix.MatrixArray): matrix.MatrixArray {
        m = m || [];
        mIdentity(m);

        const origin = target.origin;
        const scale = target.scale || [1, 1];
        const rotation = target.rotation || 0;
        const position = target.position || [0, 0];

        if (origin) {
            // Translate to origin
            m[4] -= origin[0];
            m[5] -= origin[1];
        }
        matrix.scale(m, m, scale);
        if (rotation) {
            matrix.rotate(m, m, rotation);
        }
        if (origin) {
            // Translate back from origin
            m[4] += origin[0];
            m[5] += origin[1];
        }

        m[4] += position[0];
        m[5] += position[1];

        return m;
    }
};

export default Transformable;