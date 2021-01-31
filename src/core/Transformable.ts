import * as matrix from './matrix';
import * as vector from './vector';

const mIdentity = matrix.identity;

const EPSILON = 5e-5;

function isNotAroundZero(val: number) {
    return val > EPSILON || val < -EPSILON;
}

const scaleTmp: vector.VectorArray = [];
const tmpTransform: matrix.MatrixArray = [];
const originTransform = matrix.create();
const abs = Math.abs;

class Transformable {

    parent: Transformable

    x: number
    y: number
    scaleX: number
    scaleY: number

    rotation: number
    /**
     * 旋转和缩放的原点
     */
    originX: number
    originY: number

    /**
     * Scale ratio
     */
    globalScaleRatio: number

    transform: matrix.MatrixArray
    invTransform: matrix.MatrixArray

    /**
     * Set position from array
     */
    setPosition(arr: number[]) {
        this.x = arr[0];
        this.y = arr[1];
    }
    /**
     * Set scale from array
     */
    setScale(arr: number[]) {
        this.scaleX = arr[0];
        this.scaleY = arr[1];
    }

    /**
     * Set origin from array
     */
    setOrigin(arr: number[]) {
        this.originX = arr[0];
        this.originY = arr[1];
    }

    /**
     * If needs to compute transform
     */
    needLocalTransform(): boolean {
        return isNotAroundZero(this.rotation)
            || isNotAroundZero(this.x)
            || isNotAroundZero(this.y)
            || isNotAroundZero(this.scaleX - 1)
            || isNotAroundZero(this.scaleY - 1);
    }

    /**
     * Update global transform
     */
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

        this._resolveGlobalScaleRatio(m);
    }

    private _resolveGlobalScaleRatio(m: matrix.MatrixArray) {
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
    /**
     * Get computed local transform
     */
    getLocalTransform(m?: matrix.MatrixArray) {
        return Transformable.getLocalTransform(this, m);
    }

    /**
     * Get computed global transform
     * NOTE: this method will force update transform on all ancestors.
     * Please be aware of the potential performance cost.
     */
    getComputedTransform() {
        let transformNode: Transformable = this;
        const ancestors: Transformable[] = [];
        while (transformNode) {
            ancestors.push(transformNode);
            transformNode = transformNode.parent;
        }

        // Update from topdown.
        while (transformNode = ancestors.pop()) {
            transformNode.updateTransform();
        }

        return this.transform;
    }

    setLocalTransform(m: vector.VectorArray) {
        if (!m) {
            // TODO return or set identity?
            return;
        }
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

        // rotation is inversed in zrender.
        this.rotation = Math.atan2(-m[1] / sy, m[0] / sx);

        // Flip can be both represented with rotation and negative scale.
        if (sx < 0 && sy < 0) {
            this.rotation += Math.PI;
            sx = -sx;
            sy = -sy;
        }

        this.x = m[4];
        this.y = m[5];
        this.scaleX = sx;
        this.scaleY = sy;
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
        const ox = this.originX;
        const oy = this.originY;
        if (ox || oy) {
            originTransform[4] = ox;
            originTransform[5] = oy;
            matrix.mul(tmpTransform, m, originTransform);
            tmpTransform[4] -= ox;
            tmpTransform[5] -= oy;
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
    transformCoordToLocal(x: number, y: number): number[] {
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
    transformCoordToGlobal(x: number, y: number): number[] {
        const v2 = [x, y];
        const transform = this.transform;
        if (transform) {
            vector.applyTransform(v2, v2, transform);
        }
        return v2;
    }


    getLineScale() {
        const m = this.transform;
        // Get the line scale.
        // Determinant of `m` means how much the area is enlarged by the
        // transformation. So its square root can be used as a scale factor
        // for width.
        return m && abs(m[0] - 1) > 1e-10 && abs(m[3] - 1) > 1e-10
            ? Math.sqrt(abs(m[0] * m[3] - m[2] * m[1]))
            : 1;
    }


    static getLocalTransform(target: Transformable, m?: matrix.MatrixArray): matrix.MatrixArray {
        m = m || [];
        mIdentity(m);

        const ox = target.originX || 0;
        const oy = target.originY || 0;
        const sx = target.scaleX;
        const sy = target.scaleY;
        const rotation = target.rotation || 0;
        const x = target.x;
        const y = target.y;

        // Translate to origin
        m[4] -= ox;
        m[5] -= oy;
        // Apply scale
        m[0] *= sx;
        m[1] *= sy;
        m[2] *= sx;
        m[3] *= sy;
        m[4] *= sx;
        m[5] *= sy;

        if (rotation) {
            matrix.rotate(m, m, rotation);
        }
        // Translate back from origin
        m[4] += ox;
        m[5] += oy;

        m[4] += x;
        m[5] += y;

        return m;
    }

    private static initDefaultProps = (function () {
        const proto = Transformable.prototype;
        proto.x = 0;
        proto.y = 0;
        proto.scaleX = 1;
        proto.scaleY = 1;
        proto.originX = 0;
        proto.originY = 0;
        proto.rotation = 0;
        proto.globalScaleRatio = 1;
    })()
};

export default Transformable;