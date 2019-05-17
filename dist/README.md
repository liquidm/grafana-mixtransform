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


### Hints

- Lodash is available as `_` variable
- Access the datasource parameters with `this`, e.g. `this.queryType`, `this.refId`

### Known limitations

- It's not possible to change the datasource from built-in `-- Mix --` or another datasource.
The `Mix & Transform` should be selected before adding any other datasource. 
Otherwise existing datasource [will be broken](https://github.com/grafana/grafana/blob/986f6689de67429a9265ff5fa5a3415796162d5f/public/app/features/panel/metrics_tab.ts#L92-L95).  