/**
 * Dean Edwards p.a.c.k.e.d Unpacker
 * Decodes JavaScript obfuscated with eval(function(p,a,c,k,e,d)...)
 * Compatible with QuickJS and Hermes runtimes.
 */

function unpackDeanEdwards(str) {
    if (!str || typeof str !== 'string') return null;
    var match = str.match(/eval\(function\(p,a,c,k,e,[rd]\)\s*\{.+?\}\s*\(\s*([x\x27\x22].+?)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([x\x27\x22].+?)\.split\(\s*[\x27\x22]\|[\x27\x22]\s*\)/);
    if (!match) return null;

    var p = match[1];
    if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) {
        p = p.slice(1, -1);
    }
    p = p.replace(/\x27/g, "'").replace(/\"/g, '"').replace(/\\/g, '\');

    var a = parseInt(match[2], 10);
    var c = parseInt(match[3], 10);
    var kStr = match[4];
    if ((kStr.startsWith("'") && kStr.endsWith("'")) || (kStr.startsWith('"') && kStr.endsWith('"'))) {
        kStr = kStr.slice(1, -1);
    }
    var k = kStr.split('|');

    function baseN(val, radix) {
        if (radix === 10) return String(val);
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var res = '';
        do {
            res = chars[val % radix] + res;
            val = Math.floor(val / radix);
        } while (val > 0);
        return res;
    }

    for (var i = c - 1; i >= 0; i--) {
        var key = baseN(i, a);
        var val = k[i] || key;
        if (val !== key) {
            var reg = new RegExp('\\b' + key + '\\b', 'g');
            p = p.replace(reg, val);
        }
    }
    return p;
}

module.exports = {
    unpackDeanEdwards
};
