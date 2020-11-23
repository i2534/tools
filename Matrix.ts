//see also //https://threejs.org/docs/#api/en/math/Matrix3 https://github.com/chrvadala/transformation-matrix

//https://github.com/leeoniya/transformation-matrix-js/blob/master/src/matrix.js
export default class Matrix {

    public static default: Matrix = new Matrix();

    readonly a: number = 1;
    readonly b: number = 0;
    readonly c: number = 0;
    readonly d: number = 1;
    readonly e: number = 0;
    readonly f: number = 0;

    constructor(array?: number[]);
    constructor(matrix: Object);
    constructor(a: number, b: number, c: number, d: number, e: number, f: number);

    constructor(o: any, ...args: number[]) {
        if (Array.isArray(o)) {
            [this.a, this.b, this.c, this.d, this.e, this.f] = o;
        } else {
            switch (typeof o) {
                case 'number':
                    this.a = o;
                    [this.b, this.c, this.d, this.e, this.f] = args;
                    break;
                case 'object':
                    this.a = Number.parseFloat(o.a);
                    this.b = Number.parseFloat(o.b);
                    this.c = Number.parseFloat(o.c);
                    this.d = Number.parseFloat(o.d);
                    this.e = Number.parseFloat(o.e);
                    this.f = Number.parseFloat(o.f);
                    break;
            }
        }
    }

    /**
     * Multiplies current matrix with new matrix values.
     * @param {number} A - scale x
     * @param {number} B - skew y
     * @param {number} C - skew x
     * @param {number} D - scale y
     * @param {number} E - translate x
     * @param {number} F - translate y
     */
    transform(A: number, B: number, C: number, D: number, E: number, F: number): Matrix {
        const { a, b, c, d, e, f } = this;
        return new Matrix(
            a * A + c * B,
            b * A + d * B,
            a * C + c * D,
            b * C + d * D,
            a * E + c * F + e,
            b * E + d * F + f
        );
    }

    /**
     * Merge multiple matrices into one
     */
    multiply(other: Matrix): Matrix {
        return this.transform(other.a, other.b, other.c, other.d, other.e, other.f);
    }

    /**
     * Get an inverse matrix of current matrix. The method returns a new
     * matrix with values you need to use to get to an identity matrix.
     * Context from parent matrix is not applied to the returned matrix.
     */
    inverse(): Matrix {
        const { a, b, c, d, e, f } = this;
        const dt = a * d - b * c
        return new Matrix(
            d / dt,
            b / -dt,
            c / -dt,
            a / dt,
            (d * e - c * f) / -dt,
            (b * e - a * f) / dt
        );
    }

    /**
     * Apply current matrix to x and y point.
     * Returns a point object.
     *
     * @param {number} x - value for x
     * @param {number} y - value for y
     * @returns {[x: number, y: number]} A new transformed point tuple
     */
    applyToPoint(x: number, y: number): number[] {
        return [
            x * this.a + y * this.c + this.e,
            x * this.b + y * this.d + this.f
        ];
    }

    toArray(): number[] {
        return [this.a, this.b, this.c, this.d, this.e, this.f];
    }

    equals(matrix: Matrix): boolean {
        const es = this.toArray();
        const me = matrix.toArray();
        for (let i = 0; i < es.length; i++) {
            if (es[i] !== me[i]) return false;
        }
        return true;
    }

    /**
     * Translate current matrix accumulative.
     * @param {number} tx - translation for x
     * @param {number} ty - translation for y
     */
    translate(tx: number, ty: number): Matrix {
        return this.transform(1, 0, 0, 1, tx, ty);
    }

    /**
     * Translate current matrix on x axis accumulative.
     * @param {number} tx - translation for x
     */
    translateX(tx: number): Matrix {
        return this.transform(1, 0, 0, 1, tx, 0);
    }

    /**
     * Translate current matrix on y axis accumulative.
     * @param {number} ty - translation for y
     */
    translateY(ty: number): Matrix {
        return this.transform(1, 0, 0, 1, 0, ty);
    }

    /**
     * Scales current matrix accumulative.
     * @param {number} sx - scale factor x (1 does nothing)
     * @param {number} sy - scale factor y (1 does nothing)
     */
    scale(sx: number, sy: number): Matrix {
        return this.transform(sx, 0, 0, sy, 0, 0);
    }

    /**
     * Scales current matrix on x axis accumulative.
     * @param {number} sx - scale factor x (1 does nothing)
     */
    scaleX(sx: number): Matrix {
        return this.transform(sx, 0, 0, 1, 0, 0);
    }

    /**
     * Scales current matrix on y axis accumulative.
     * @param {number} sy - scale factor y (1 does nothing)
     */
    scaleY(sy: number): Matrix {
        return this.transform(1, 0, 0, sy, 0, 0);
    }

    /**
     * Apply skew to the current matrix accumulative.
     * @param {number} sx - amount of skew for x
     * @param {number} sy - amount of skew for y
     */
    skew(sx: number, sy: number): Matrix {
        return this.transform(1, sy, sx, 1, 0, 0);
    }

    /**
     * Apply skew for x to the current matrix accumulative.
     * @param {number} sx - amount of skew for x
     */
    skewX(sx: number): Matrix {
        return this.transform(1, 0, sx, 1, 0, 0);
    }

    /**
     * Apply skew for y to the current matrix accumulative.
     * @param {number} sy - amount of skew for y
     */
    skewY(sy: number): Matrix {
        return this.transform(1, sy, 0, 1, 0, 0);
    }

    /**
     * Flips the horizontal values.
     */
    flipX(): Matrix {
        return this.transform(-1, 0, 0, 1, 0, 0);
    }

    /**
     * Flips the vertical values.
     */
    flipY(): Matrix {
        return this.transform(1, 0, 0, -1, 0, 0);
    }

    /**
     * Rotates current matrix accumulative by angle.
     * @param {number} angle - angle in radians
     */
    rotate(angle: number): Matrix {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return this.transform(cos, sin, -sin, cos, 0, 0);
    }

    /**
     * Helper method to make a rotation based on an angle in degrees.
     * @param {number} angle - angle in degrees
     */
    rotateDeg(angle: number): Matrix {
        return this.rotate(angle * 0.017453292519943295);
    }

}
