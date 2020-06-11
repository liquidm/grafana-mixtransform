///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import angular from 'angular';
import moment from 'moment';
import parseDuration from './utils/parseDuration';

export default class MixTransformDatasource {
    instanceSettings: any;
    q: any;
    backendSrv: any;
    templateSrv: any;
    datasourceSrv: any;
    transformers: any = {};
    timeshiftSuffixes: any = {};

    /** @ngInject */
    constructor(instanceSettings, $q, backendSrv, templateSrv, datasourceSrv) {
        this.instanceSettings = instanceSettings;
        this.instanceSettings.jsonData = this.instanceSettings.jsonData || {};
        this.backendSrv = backendSrv;
        this.q = $q;
        this.templateSrv = templateSrv;
        this.datasourceSrv = datasourceSrv;
    }

    query(options) {
        const sets = _.groupBy(options.targets, 'datasource');
        this.transformers[options.panelId] = _.find(sets, (targets, name) => name === this.instanceSettings.name) || [];
        const promises = _
            .filter(sets, (targets, name) => name !== this.instanceSettings.name)
            .flatMap(targets => {
                let r = [];
                r.push(
                    this.datasourceSrv.get(targets[0].datasource).then(ds => {
                        const opt = angular.copy(options);
                        opt.targets = targets;
                        return ds.query(opt);
                    })
                );
                let timeshift = _.find(this.transformers[options.panelId], v => v.timeshiftValue);
                if (timeshift) {
                    let timeshiftValue = this.templateSrv.replace(timeshift.timeshiftValue);
                    if (timeshiftValue !== 'none') {
                        this.timeshiftSuffixes[options.panelId] = timeshift.timeshiftSuffix || '_previous';
                        r.push(
                            this.datasourceSrv.get(targets[0].datasource).then(ds => {
                                const opt = angular.copy(options);
                                opt.targets = targets;
                                opt.range.from.subtract(parseDuration(timeshiftValue), 'ms');
                                opt.range.to.subtract(parseDuration(timeshiftValue), 'ms');
                                return ds.query(opt);
                            })
                        )
                    }
                }
                return r;
            });

        return this.q.all(promises).then(results => {
            let data = _.flatten(_.map(results, 'data'));
            if (data && data.length > 0) {
                // un-shift timeshifts
                _.forEach(data, (firstItem, firstIndex) => {
                    let secondIndex = _.findIndex(data, v => v.target === firstItem.target, firstIndex + 1);
                    if (secondIndex >= 0 && data[secondIndex].datapoints && data[secondIndex].datapoints.length > 0) {
                        let originalIndex, shiftedIndex;
                        if (data[firstIndex].datapoints[0][1] < data[secondIndex].datapoints[0][1]) {
                            originalIndex = secondIndex;
                            shiftedIndex = firstIndex;
                        } else {
                            originalIndex = firstIndex;
                            shiftedIndex = secondIndex;
                        }
                        data[shiftedIndex].target += this.timeshiftSuffixes[options.panelId];
                        data[shiftedIndex].datapoints = _.map(data[shiftedIndex].datapoints, (v, k) => {
                            // overriding timestamps in the shifted series
                            if (data[originalIndex].datapoints[k]) {
                                data[shiftedIndex].datapoints[k][1] = data[originalIndex].datapoints[k][1];
                                return data[shiftedIndex].datapoints[k];
                            }
                        }).filter(v => v);
                    }
                });

                // apply transformers
                _.forEach(this.transformers[options.panelId], t => {
                    if (t.queryType === 'each') {
                        if (_.find(data, d => Number.isInteger(parseInt(d.target)) || (d.target === 'null'))) {
                            this.transformEachWithArray(t, data);
                        } else {
                            this.transformEachWithObjects(t, data);
                        }
                    } else if (t.queryType === 'callback') {
                        data = this.transformCallback(t, data)
                    }
                });
            }
            return {data: data};
        });
    }

    transformEachWithObjects(transformer, data) {
        if (_.find(data, d => d.target.indexOf(':') >= 0)) return;
        let body =
            _.reduce(data, (ac, v) => ac + `let ${v.target} = values.${v.target}; `, '') + '\n' +
            this.templateSrv.replace(transformer.code) + ';\n' +
            _.reduce(data, (ac, v) => ac + `values.${v.target} = ${v.target}; `, '') +
            'return values;';
        this.transformEach(transformer, data, body);
    }

    transformEachWithArray(transformer, data) {
        if (_.find(data, d => d.target.indexOf(':') >= 0)) return;
        let body =
            this.templateSrv.replace(transformer.code) + ';\n' +
            'return values;';
        this.transformEach(transformer, data, body);
    }

    transformEach(transformer, data, body) {
        let f = new Function('datasource', 'datapoint', 'values', body);
        _.forEach(data[0].datapoints, (datapoint, index) => {
            let values = _.reduce(data, (ac, v) => {
                if (v.datapoints[index]) ac[v.target] = v.datapoints[index][0];
                return ac;
            }, {});
            let upd = f.apply(transformer, [this, datapoint[1], values]);
            _.forEach(upd, (value, key) => {
                let i = _.findIndex(data, d => d.target === key);
                if (i === -1) {
                    i = data.length;
                    data.push({target: key, datapoints: []});
                }
                if (!data[i].datapoints[index]) {
                    data[i].datapoints[index] = [];
                    data[i].datapoints[index][1] = datapoint[1];
                }
                data[i].datapoints[index][0] = value;
            });
        });
    }

    transformCallback(transformer, data) {
        let f = new Function('datasource', 'data',
            _.reduce(MixTransformDatasource.injection, (a, v, k) => a + `${k} = ${v.toString()}\n`, '') +
            this.templateSrv.replace(transformer.code));
        let res = f.apply(transformer, [this, data]);
        return res ? res : data;
    }

    public static readonly injection: any = {
        movingAverage: function (datapoints, depth) {
            let res = [];
            for (let i = 0; i < datapoints.length; i++) {
                res[i] = [0, datapoints[i][1]];
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    res[i][0] += datapoints[i - j][0];
                }
                res[i][0] /= Math.min(i + 1, depth);
            }
            return res;
        },
        movingAverageRange: function (datapoints, depth) {
            let res: any = {};
            res.raw = [];
            res.average = [];
            res.high = [];
            res.low = [];
            for (let i = 0; i < datapoints.length; i++) {
                res.raw[i] = [datapoints[i][0], datapoints[i][1]];
                res.average[i] = [0, datapoints[i][1]];
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    res.average[i][0] += datapoints[i - j][0];
                }
                res.average[i][0] /= Math.min(i + 1, depth);
                let dev = 0;
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    dev += Math.pow(res.average[i][0] - datapoints[i - j][0], 2);
                }
                dev = Math.sqrt(dev / Math.min(i + 1, depth));
                res.high[i] = [res.average[i][0] + dev/2, res.raw[i][1]];
                res.low[i] = [res.average[i][0] - dev/2, res.raw[i][1]];
            }
            // this['_'] is intentional, just _ will be replaced by compiler
            return this['_'].reduce(res, (a, v, k) => {a.push({target: k, datapoints: v}); return a;}, []);
        },
        movingAverageRatioRange: function (data, dividend, divisor, koef, name, depth) {
            let res: any = {};
            res.raw = [];
            res.average = [];
            res.high = [];
            res.low = [];
            let dividendTarget = data.find(v => v.target === dividend),
                divisorTarget = data.find(v => v.target === divisor);
            if (!dividendTarget || !divisorTarget) return {target: name, datapoints: []};
            let dpDividend = dividendTarget.datapoints,
                dpDivisor = divisorTarget.datapoints;
            for (let i = 0; i < dpDividend.length; i++) {
                res.raw[i] = [dpDividend[i][0] / dpDivisor[i][0] * koef, dpDividend[i][1]];
                let sumDividend = 0,
                    sumDivisor = 0;
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    sumDividend += dpDividend[i - j][0];
                    sumDivisor += dpDivisor[i - j][0];
                }
                res.average[i] = [sumDividend / sumDivisor * koef, dpDividend[i][1]];
                let dev = 0;
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    dev += Math.pow(res.average[i][0] - res.raw[i - j][0], 2);
                }
                dev = Math.sqrt(dev / Math.min(i + 1, depth));
                res.high[i] = [res.average[i][0] + dev/2, res.raw[i][1]];
                res.low[i] = [res.average[i][0] - dev/2, res.raw[i][1]];
            }
            // this['_'] is intentional, just _ will be replaced by compiler
            return this['_'].reduce(res, (a, v, k) => {a.push({target: name + '_' + k, datapoints: v}); return a;}, []);
        },
        movingWAverage: function (datapoints, depth) {
            let res = [];
            for (let i = 0; i < datapoints.length; i++) {
                res[i] = [0, datapoints[i][1]];
                let sum = 0;
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    res[i][0] += datapoints[i - j][0] * (depth - j);
                    sum += depth - j;
                }
                res[i][0] /= sum;
            }
            return res;
        },
        movingWAverageRange: function (datapoints, depth) {
            let res: any = {};
            res.raw = [];
            res.average = [];
            res.high = [];
            res.low = [];
            for (let i = 0; i < datapoints.length; i++) {
                res.raw[i] = [datapoints[i][0], datapoints[i][1]];
                res.average[i] = [0, datapoints[i][1]];
                let sum = 0;
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    res.average[i][0] += datapoints[i - j][0] * (depth - j);
                    sum += depth - j;
                }
                res.average[i][0] /= sum;
                let dev = 0;
                sum = 0;
                for (let j = 1; j < (depth - 1) && i - j >= 0; j++) {
                    dev += Math.pow(res.average[i][0] - datapoints[i - j][0], 2) * ((depth - 1) - j);
                    sum += (depth - 1) - j;
                }
                if (i < 2) {
                    dev = 0;
                } else {
                    dev = Math.sqrt(dev /
                        ((Math.min(i, depth - 1) - 1) / Math.min(i, depth - 1) * sum)
                    );
                }
                res.high[i] = [res.average[i][0] + dev / 2, res.raw[i][1]];
                res.low[i] = [res.average[i][0] - dev / 2, res.raw[i][1]];
            }
            // this['_'] is intentional, just _ will be replaced by compiler
            return this['_'].reduce(res, (a, v, k) => {a.push({target: k, datapoints: v}); return a;}, []);
        },
        movingWAverageRatioRange: function (data, dividend, divisor, koef, name, depth) {
            let res: any = {};
            res.raw = [];
            res.average = [];
            res.high = [];
            res.low = [];
            let dividendTarget = data.find(v => v.target === dividend),
                divisorTarget = data.find(v => v.target === divisor);
            if (!dividendTarget || !divisorTarget) return {target: name, datapoints: []};
            let dpDividend = dividendTarget.datapoints,
                dpDivisor = divisorTarget.datapoints;
            for (let i = 0; i < dpDividend.length; i++) {
                res.raw[i] = [dpDividend[i][0] / dpDivisor[i][0] * koef, dpDividend[i][1]];
                let sumDividend = 0,
                    sumDivisor = 0;
                let sum = 0;
                for (let j = 0; j < depth && i - j >= 0; j++) {
                    sumDividend += dpDividend[i - j][0] * (depth - j);
                    sumDivisor += dpDivisor[i - j][0] * (depth - j);
                    sum += depth - j;
                }
                res.average[i] = [sumDividend / sumDivisor * koef, dpDividend[i][1]];
                let dev = 0;
                sum = 0;
                for (let j = 1; j < (depth - 1) && i - j >= 0; j++) {
                    dev += Math.pow(res.average[i][0] - res.raw[i - j][0], 2) * ((depth - 1) - j);
                    sum += (depth - 1) - j;
                }
                if (i < 2) {
                    dev = 0;
                } else {
                    dev = Math.sqrt(dev /
                        ((Math.min(i, depth - 1) - 1) / Math.min(i, depth - 1) * sum)
                    );
                }
                res.high[i] = [res.average[i][0] + dev / 2, res.raw[i][1]];
                res.low[i] = [res.average[i][0] - dev / 2, res.raw[i][1]];
            }
            // this['_'] is intentional, just _ will be replaced by compiler
            return this['_'].reduce(res, (a, v, k) => {a.push({target: name + '_' + k, datapoints: v}); return a;}, []);
        },
        collapseDatapoints: function(allowedValues, data, label) {
            if (!allowedValues || !allowedValues.length) return data;
            var aggregatedDatapoints = data
                .map(d => !(d.target && allowedValues.find(v => d.target.match(v))) ? d.datapoints : undefined)
                .filter(v => v)
                .reduce((a, cv) => {
                    this['_'].forEach(cv, dp => a[dp[1]] = (a[dp[1]] || 0) + dp[0]);
                    return a;
                }, {});
            var newDatapoints = [];
            Object.keys(aggregatedDatapoints ).sort().forEach(k => newDatapoints.push([aggregatedDatapoints[k], k]));
            data = data.filter(d => (d.target && allowedValues.find(v => d.target.match(v))));
            data.push({target: label || 'others', datapoints: newDatapoints});
            return data;
        },
        humanizeVariable(datasource, varName, config, id) {
            if (!varName || !datasource || !datasource.templateSrv) return id;
            if (config && config.mapValues && config.mapValues.varMap[varName]) varName = config.mapValues.varMap[varName];

            var templateVar = datasource.templateSrv.index[varName] || datasource.templateSrv.getVariables().find(e => e.name == varName);
            if (!templateVar) return id;

            var templateOpt = templateVar.options.find(e => e.value.split(",").includes(id));
            if (!templateOpt) return id;

            return templateOpt.text;
        }
    };

}
