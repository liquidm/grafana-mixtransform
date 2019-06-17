System.register(["lodash", "angular", "./utils/parseDuration"], function (exports_1, context_1) {
    "use strict";
    var lodash_1, angular_1, parseDuration_1, MixTransformDatasource;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (parseDuration_1_1) {
                parseDuration_1 = parseDuration_1_1;
            }
        ],
        execute: function () {
            MixTransformDatasource = (function () {
                function MixTransformDatasource(instanceSettings, $q, backendSrv, templateSrv, datasourceSrv) {
                    this.transformers = {};
                    this.timeshiftSuffixes = {};
                    this.instanceSettings = instanceSettings;
                    this.instanceSettings.jsonData = this.instanceSettings.jsonData || {};
                    this.backendSrv = backendSrv;
                    this.q = $q;
                    this.templateSrv = templateSrv;
                    this.datasourceSrv = datasourceSrv;
                }
                MixTransformDatasource.prototype.query = function (options) {
                    var _this = this;
                    var sets = lodash_1.default.groupBy(options.targets, 'datasource');
                    this.transformers[options.panelId] = lodash_1.default.find(sets, function (targets, name) { return name === _this.instanceSettings.name; }) || [];
                    var promises = lodash_1.default
                        .filter(sets, function (targets, name) { return name !== _this.instanceSettings.name; })
                        .flatMap(function (targets) {
                        var r = [];
                        r.push(_this.datasourceSrv.get(name).then(function (ds) {
                            var opt = angular_1.default.copy(options);
                            opt.targets = targets;
                            return ds.query(opt);
                        }));
                        var timeshift = lodash_1.default.find(_this.transformers[options.panelId], function (v) { return v.timeshiftValue; });
                        if (timeshift) {
                            _this.timeshiftSuffixes[options.panelId] = timeshift.timeshiftSuffix || '_previous';
                            var timeshiftValue_1 = _this.templateSrv.replace(timeshift.timeshiftValue);
                            r.push(_this.datasourceSrv.get(name).then(function (ds) {
                                var opt = angular_1.default.copy(options);
                                opt.targets = targets;
                                opt.range.from.subtract(parseDuration_1.default(timeshiftValue_1), 'ms');
                                opt.range.to.subtract(parseDuration_1.default(timeshiftValue_1), 'ms');
                                return ds.query(opt);
                            }));
                        }
                        return r;
                    })
                        .filter(function (e) { return e; });
                    return this.q.all(promises).then(function (results) {
                        var data = lodash_1.default.flatten(lodash_1.default.map(results, 'data'));
                        if (data && data.length > 0) {
                            lodash_1.default.forEach(data, function (firstItem, firstIndex) {
                                var secondIndex = lodash_1.default.findIndex(data, function (v) { return v.target === firstItem.target; }, firstIndex + 1);
                                if (secondIndex >= 0 && data[secondIndex].datapoints && data[secondIndex].datapoints.length > 0) {
                                    var originalIndex_1, shiftedIndex_1;
                                    if (data[firstIndex].datapoints[0][1] < data[secondIndex].datapoints[0][1]) {
                                        originalIndex_1 = secondIndex;
                                        shiftedIndex_1 = firstIndex;
                                    }
                                    else {
                                        originalIndex_1 = firstIndex;
                                        shiftedIndex_1 = secondIndex;
                                    }
                                    data[shiftedIndex_1].target += _this.timeshiftSuffixes[options.panelId];
                                    lodash_1.default.forEach(data[shiftedIndex_1].datapoints, function (v, k) {
                                        data[shiftedIndex_1].datapoints[k][1] = data[originalIndex_1].datapoints[k][1];
                                    });
                                }
                            });
                            lodash_1.default.forEach(_this.transformers[options.panelId], function (t) {
                                if (t.queryType === 'each') {
                                    if (lodash_1.default.find(data, function (d) { return Number.isInteger(parseInt(d.target)); })) {
                                        _this.transformEachWithArray(t, data);
                                    }
                                    else {
                                        _this.transformEachWithObjects(t, data);
                                    }
                                }
                                else if (t.queryType === 'callback') {
                                    _this.transformCallback(t, data);
                                }
                            });
                        }
                        return { data: data };
                    });
                };
                MixTransformDatasource.prototype.transformEachWithObjects = function (transformer, data) {
                    if (lodash_1.default.find(data, function (d) { return d.target.indexOf(':') >= 0; }))
                        return;
                    var body = lodash_1.default.reduce(data, function (ac, v) { return ac + ("let " + v.target + " = values." + v.target + "; "); }, '') + '\n' +
                        transformer.code + ';\n' +
                        lodash_1.default.reduce(data, function (ac, v) { return ac + ("values." + v.target + " = " + v.target + "; "); }, '') +
                        'return values;';
                    this.transformEach(transformer, data, body);
                };
                MixTransformDatasource.prototype.transformEachWithArray = function (transformer, data) {
                    if (lodash_1.default.find(data, function (d) { return d.target.indexOf(':') >= 0; }))
                        return;
                    var body = transformer.code + ';\n' +
                        'return values;';
                    this.transformEach(transformer, data, body);
                };
                MixTransformDatasource.prototype.transformEach = function (transformer, data, body) {
                    var _this = this;
                    var f = new Function('datasource', 'datapoint', 'values', body);
                    lodash_1.default.forEach(data[0].datapoints, function (datapoint, index) {
                        var values = lodash_1.default.reduce(data, function (ac, v) {
                            if (v.datapoints[index])
                                ac[v.target] = v.datapoints[index][0];
                            return ac;
                        }, {});
                        var upd = f.apply(transformer, [_this, datapoint[1], values]);
                        lodash_1.default.forEach(upd, function (value, key) {
                            var i = lodash_1.default.findIndex(data, function (d) { return d.target === key; });
                            if (i === -1) {
                                i = data.length;
                                data.push({ target: key, datapoints: [] });
                            }
                            if (!data[i].datapoints[index]) {
                                data[i].datapoints[index] = [];
                                data[i].datapoints[index][1] = datapoint[1];
                            }
                            data[i].datapoints[index][0] = value;
                        });
                    });
                };
                MixTransformDatasource.prototype.transformCallback = function (transformer, data) {
                    var f = new Function('datasource', 'data', transformer.code);
                    f.apply(transformer, [this, data]);
                };
                return MixTransformDatasource;
            }());
            exports_1("default", MixTransformDatasource);
        }
    };
});
//# sourceMappingURL=datasource.js.map