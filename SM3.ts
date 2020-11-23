//import {BigInteger} from 'jsbn';

const DEBUG = false;
const BLOCK_SIZE = 512, BLOCK_MIN = 448, BPB = 8;//bits per byte
function padding(m: Buffer): Buffer {
    /* if (m.byteLength != BPB) {
        throw new Error(`byte length != ${BPB} bit?`);
    } */
    DEBUG && console.log('m', m.toString('hex'));
    let bytes = m.length, bits = bytes * BPB;
    let k: number = BLOCK_MIN - (bits + 1) % BLOCK_SIZE;
    if (k < 0) {
        k += BLOCK_SIZE;
    }
    const LEN = 64;
    let m1: Buffer = Buffer.alloc((bits + 1 + k + LEN) / BPB);
    m1.fill(m, 0, m.length);
    DEBUG && console.log('m1 length', m1.length);
    DEBUG && console.log(m1.toString('hex'));
    let index = bytes;
    m1.writeInt8(-0x80, index++);
    DEBUG && console.log(m1.toString('hex'));
    // let i = k - 7;
    // while (i > 0) {
    //     m1.writeUInt8(0x00, index++);
    //     i -= 8;
    // }
    m1.writeUIntBE(bits, m1.length - LEN / BPB, LEN / BPB);
    return m1; 
}
const hexDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
function toInt(m: Buffer, index: number): number {
    let v = new Array();
    for (let i = 0; i < 4; i++) {
        let n = m.readUInt8(index * 4 + i);
        v.push(hexDigits[(n & 0xF0) >> 4]);
        v.push(hexDigits[(n & 0x0F)]);
    }
    return parseInt(v.join(''), 16);
}
function toBytes(v: number): Buffer {
    const buf: Buffer = Buffer.alloc(4);
    buf.writeUInt8((v) >>> 24, 0);
    buf.writeUInt8((v & 0xFFFFFF) >>> 16, 1);
    buf.writeUInt8((v & 0xFFFF) >>> 8, 2);
    buf.writeUInt8((v & 0xFF), 3);
    return buf;
}
function rot(i: number, distance: number): number {
    return (i << distance) | (i >>> -distance);
}
function P0(X: number): number {
    return X ^ rot(X, 9) ^ rot(X, 17);
}
function P1(X: number): number {
    return X ^ rot(X, 15) ^ rot(X, 23);
}

function at(v: number, min: number, max: number): boolean {
    return v >= min && v <= max;
}
function atMin(v: number): boolean {
    return at(v, 0, 15);
}
function atMax(v: number): boolean {
    return at(v, 16, 63);
}
function T(j: number): number {
    if (atMin(j)) {
        return 0x79cc4519;
    }
    if (atMax(j)) {
        return 0x7a879d8a;
    }
    throw new Error('Tj out of range');
}
function FF(X: number, Y: number, Z: number, j: number): number {
    if (atMin(j)) {
        return X ^ Y ^ Z;
    }
    if (atMax(j)) {
        return (X & Y) | (X & Z) | (Y & Z);
    }
    throw new Error('FF out of range');
}
function GG(X: number, Y: number, Z: number, j: number): number {
    if (atMin(j)) {
        return X ^ Y ^ Z;
    }
    if (atMax(j)) {
        return (X & Y) | (~X & Z);
    }
    throw new Error('GG out of range');
}
function CF(m: Buffer, V: Buffer): Buffer {
    //消息扩展
    const W = new Array(68), W1 = new Array(64);
    for (let i = 0; i < 16; i++) {
        W[i] = toInt(m, i);
    }
    for (let j = 16; j < 68; j++) {
        W[j] = P1(W[j - 16] ^ W[j - 9] ^ rot(W[j - 3], 15)) ^ rot(W[j - 13], 7) ^ W[j - 6];
    }
    DEBUG && console.log(W.map(v => v.toString(16)).join(' '));
    for (let j = 0; j < 64; j++) {
        W1[j] = W[j] ^ W[j + 4];
    }
    DEBUG && console.log(W1.map(v => v.toString(16)).join(' '));

    //压缩函数
    let A: number, B: number, C: number, D: number, E: number, F: number, G: number, H: number;
    let SS1: number, SS2: number, TT1: number, TT2: number;

    A = toInt(V, 0);
    B = toInt(V, 1);
    C = toInt(V, 2);
    D = toInt(V, 3);
    E = toInt(V, 4);
    F = toInt(V, 5);
    G = toInt(V, 6);
    H = toInt(V, 7);

    for (let j = 0; j < 64; j++) {
        SS1 = rot(rot(A, 12) + E + rot(T(j), j), 7);
        SS2 = SS1 ^ rot(A, 12);
        TT1 = FF(A, B, C, j) + D + SS2 + W1[j];
        TT2 = GG(E, F, G, j) + H + SS1 + W[j];
        D = C;
        C = rot(B, 9);
        B = A;
        A = TT1;
        H = G;
        G = rot(F, 19);
        F = E;
        E = P0(TT2);
    }
    const Vi: Buffer = Buffer.alloc(32);
    Vi.fill(toBytes(A), 0);
    Vi.fill(toBytes(B), 4);
    Vi.fill(toBytes(C), 8);
    Vi.fill(toBytes(D), 12);
    Vi.fill(toBytes(E), 16);
    Vi.fill(toBytes(F), 20);
    Vi.fill(toBytes(G), 24);
    Vi.fill(toBytes(H), 28);
    for (let i = 0; i < Vi.length; i++) {
        Vi[i] = Vi[i] ^ V[i];
    }
    return Vi;
}

export default function hash(buffer: Buffer): Buffer {
    const m = padding(buffer);
    DEBUG && console.log(m.toString('hex').match(/[0-9a-fA-F]{8}/g)?.join(' '));
    let block = BLOCK_SIZE / BPB, count = m.length / block;
    let V: Buffer = Buffer.from('7380166f4914b2b9172442d7da8a0600a96f30bc163138aae38dee4db0fb0e4e', 'hex');
    for (let n = 0; n < count; n++) {
        V = CF(m.subarray(n * block, (n + 1) * block), V);
    }
    DEBUG && console.log(V.toString('hex'));
    return V;
}
