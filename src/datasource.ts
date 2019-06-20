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
                    this.timeshiftSuffixes[options.panelId] = timeshift.timeshiftSuffix || '_previous';
                    let timeshiftValue = this.templateSrv.replace(timeshift.timeshiftValue);
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
                        _.forEach(data[shiftedIndex].datapoints, (v, k) => {
                            // overriding timestamps in the shifted series
                            data[shiftedIndex].datapoints[k][1] = data[originalIndex].datapoints[k][1]
                        });
                    }
                });

                // apply transformers
                _.forEach(this.transformers[options.panelId], t => {
                    if (t.queryType === 'each') {
                        if (_.find(data, d => Number.isInteger(parseInt(d.target)))) {
                            this.transformEachWithArray(t, data);
                        } else {
                            this.transformEachWithObjects(t, data);
                        }
                    } else if (t.queryType === 'callback') {
                        this.transformCallback(t, data)
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
            transformer.code + ';\n' +
            _.reduce(data, (ac, v) => ac + `values.${v.target} = ${v.target}; `, '') +
            'return values;';
        this.transformEach(transformer, data, body);
    }

    transformEachWithArray(transformer, data) {
        if (_.find(data, d => d.target.indexOf(':') >= 0)) return;
        let body =
            transformer.code + ';\n' +
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
        let f = new Function('datasource', 'data', transformer.code);
        f.apply(transformer, [this, data]);
    }

}
