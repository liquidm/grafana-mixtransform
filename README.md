## Mix & Transform
Mix & Transform is a special datasource which allows to execute 
arbitrary operations over the results from multiple datasources.

## Query type `Each` 
Executes the callback for each datapoint
```
function callback(datasource, datapoint, values) { ... }
```
When all the metrics (data.target) are non-numeric strings 
shortcut variables are added and can be changed: 
```
ais = ais / 1000
```
How to add a new metric:
```
values.adjusted = ais / 1000
values.sum = _.reduce(values, (ac, v) => ac + v, 0);
```

### Query type `Callback` 
Executes the callback once for the whole `data` object
```
function callback(datasource, data) { ... }
```

### Timeshift
Setting the timeshift field makes the plugin to execute two identical queries except the second one has start/end date shifted by the specified value. The datapoints in the result then shifted back and each data series of the original query is duplicated with a new one (with xxx_previous name by default).

## Built-in functions
### Humanize variable
Uses the Grafana variables available for this board to replace IDs with human-friendly names:
```
var config = {
    "mapValues": {
        "varMap": {
            "advertiser_company": "advertiser",
            "account": "ssp",
            "media_type": "mediatype"
        }
    }
};
_.forEach(data, d => {
    if (d.target) d.target = humanizeVariable(datasource, '$groupby', config, d.target);
    if (d.rows) _.forEach(d.rows, (v, k) => d.rows[k][0] = humanizeVariable(datasource, '$groupby', config, d.rows[k][0]));
});
```

### Moving average and weighted moving average
Use with query type `Callback`.
Standard moving average:
```
_.forEach(data, series => {
  series.datapoints = movingAverage(series.datapoints, $depth);
})
```
Moving average range with +/- std deviation for the first series:
```
if (data.length > 0) {
  return window.movingAverageRange(data[0].datapoints, $depth);
}
```
Weighted versions `movingWAverage` and `movingWAverageRange` use decremental 
weights for the previous datapoings - depth, depth - 1, ..., 1. 

### Collapsing datapoints
collapseDatapoints allows to filter only meaningful series and collapse everything else into "other" category.
```
if ('$allowedValues') data = collapseDatapoints('$allowedValues'.split(','), data);
return data;
```


## Hints

- Lodash is available as `_` variable
- Access the datasource parameters with `this`, e.g. `this.queryType`, `this.refId`

## Known limitations

- Only the first timeshift is applied, it's not possible to add several shifts. 
- Only timeshift in the past is possible
- In Grafana 5.x it's not possible to change the datasource from built-in `-- Mix --` or another datasource.
The `Mix & Transform` should be selected before adding any other datasource. 
Otherwise existing datasource [will be broken](https://github.com/grafana/grafana/blob/986f6689de67429a9265ff5fa5a3415796162d5f/public/app/features/panel/metrics_tab.ts#L92-L95).
In Grafana 6.x it's no longer an issue  
