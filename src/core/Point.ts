import { MatrixArray } from "./matrix";

export default class Point {

    x: number

    y: number

    constructor(x: number, y: number) {
        this.x = x || 0;
        this.y = y || 0;
    }

    /**
     * Copy from another point
     */
    copy(other: Point) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    /**
     * Clone a point
     */
    clone() {
        return new Point(this.x, this.y);
    }

    /**
     * Set x and y
     */
    set(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * If equal to another point
     */
    equal(other: Point) {
        return other.x === this.x && other.y === this.y;
    }

    /**
     * Add another point
     */
    add(other: Point) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    /**
     * Sub another point
     */
    sub(other: Point) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    /**
     * Dot product with other point
     */
    dot(other: Point) {
        return this.x * other.x + this.y * other.y;
    }

    /**
     * Get length of point
     */
    len() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Get squared length
     */
    lenSquare() {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * Normalize
     */
    normalize() {
        const len = this.len();
        this.x /= len;
        this.y /= len;
        return this;
    }

    /**
     * Distance to another point
     */
    distance(other: Point) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Square distance to another point
     */
    distanceSquare(other: Point) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    /**
     * Negate
     */
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * Apply a transform matrix array.
     */
    transform(m: MatrixArray) {
        const x = this.x;
        const y = this.y;
        this.x = m[0] * x + m[2] * y + m[4];
        this.y = m[1] * x + m[3] * y + m[5];
        return this;
    }
}