"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
exports.__esModule = true;
exports.v2i = exports.i2v = exports.v2si = exports.si2v = exports.nibbles = exports.testBit = void 0;
// HELPER FUNCTIONS
function testBit(val, mask) {
    return (val & mask) == mask;
}
exports.testBit = testBit;
function nibbles(data) {
    var e_1, _a;
    var result = [];
    try {
        for (var data_1 = __values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
            var d = data_1_1.value;
            var pq = d;
            var p = pq >> 4;
            var q = pq & 15;
            result.push(p);
            result.push(q);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (data_1_1 && !data_1_1.done && (_a = data_1["return"])) _a.call(data_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return result;
}
exports.nibbles = nibbles;
function si2v(value) {
    // first, handle the possibility of signed integer values
    if (value > 32767)
        value = 32767;
    if (value < -32768)
        value = -32768;
    if (value < 0)
        value = 0xffff + value + 1; // this is the magic
    return i2v(value);
}
exports.si2v = si2v;
// data must be a buffer or array
function v2si(data) {
    if (data.length == 2)
        data = __spreadArray([
            0,
            0
        ], __read(data));
    var value = v2i(data);
    if (value > 32767)
        value = value - 0xffff - 1;
    return value;
}
exports.v2si = v2si;
function i2v(value) {
    // return word as dword in visca format
    // packets are not allowed to be 0xff
    // so for numbers the first nibble is 0b0000
    // and 0xfd gets encoded into 0x0f 0x0d
    var ms = (value & 65280) >> 8;
    var ls = value & 255;
    var p = (ms & 240) >> 4;
    var r = (ls & 240) >> 4;
    var q = ms & 15;
    var s = ls & 15;
    return [
        p,
        q,
        r,
        s
    ];
}
exports.i2v = i2v;
function v2i(data) {
    if (data.length == 2)
        data = __spreadArray([
            0,
            0
        ], __read(data));
    var _a = __read(data, 4), p = _a[0], q = _a[1], r = _a[2], s = _a[3];
    var ls = (r << 4) | (s & 15);
    var ms = (p << 4) | (q & 15);
    return (ms << 8) | ls;
}
exports.v2i = v2i;
//# sourceMappingURL=utils.js.map