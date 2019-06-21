## Mix & Transform

Mix & Transform is a special datasource which allows to execute 
arbitrary operations over the results from multiple datasources.

### Query type `Each` 
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
### Moving average
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


### Hints

- Lodash is available as `_` variable
- Access the datasource parameters with `this`, e.g. `this.queryType`, `this.refId`

### Known limitations

- Only the first timeshift is applied, it's not possible to add several shifts. 
- Only timeshift in the past is possible
- In Grafana 5.x it's not possible to change the datasource from built-in `-- Mix --` or another datasource.
The `Mix & Transform` should be selected before adding any other datasource. 
Otherwise existing datasource [will be broken](https://github.com/grafana/grafana/blob/986f6689de67429a9265ff5fa5a3415796162d5f/public/app/features/panel/metrics_tab.ts#L92-L95).
In Grafana 6.x it's no longer an issue  