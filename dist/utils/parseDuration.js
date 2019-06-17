System.register([], function (exports_1, context_1) {
    "use strict";
    var pattern;
    var __moduleName = context_1 && context_1.id;
    function parseDuration(str) {
        var result = 0;
        str = str.replace(/(\d),(\d)/g, '$1$2');
        str.replace(pattern, function (_, n, units) {
            units = parseDuration[units]
                || parseDuration[units.toLowerCase().replace(/s$/, '')]
                || 1;
            result += parseFloat(n) * units;
        });
        return result;
    }
    return {
        setters: [],
        execute: function () {
            pattern = /(-?\d*\.?\d+(?:e[-+]?\d+)?)\s*([a-zμ]*)/ig;
            parseDuration.nanosecond = parseDuration.ns = 1 / 1e6;
            parseDuration.us = parseDuration.microsecond = 1 / 1e3;
            parseDuration.millisecond = parseDuration.ms = 1;
            parseDuration.second = parseDuration.sec = parseDuration.s = parseDuration.ms * 1000;
            parseDuration.minute = parseDuration.min = parseDuration.m = parseDuration.s * 60;
            parseDuration.hour = parseDuration.hr = parseDuration.h = parseDuration.m * 60;
            parseDuration.day = parseDuration.d = parseDuration.h * 24;
            parseDuration.week = parseDuration.wk = parseDuration.w = parseDuration.d * 7;
            parseDuration.b = parseDuration.month = parseDuration.d * (365.25 / 12);
            parseDuration.year = parseDuration.yr = parseDuration.y = parseDuration.d * 365.25;
            exports_1("default", parseDuration);
        }
    };
});
//# sourceMappingURL=parseDuration.js.map