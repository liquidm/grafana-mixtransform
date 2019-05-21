export default class MixTransformDatasource {
    instanceSettings: any;
    q: any;
    backendSrv: any;
    templateSrv: any;
    datasourceSrv: any;
    transformers: any;
    constructor(instanceSettings: any, $q: any, backendSrv: any, templateSrv: any, datasourceSrv: any);
    query(options: any): any;
    transformEachWithObjects(transformer: any, data: any): void;
    transformEachWithArray(transformer: any, data: any): void;
    transformEach(transformer: any, data: any, body: any): void;
    transformCallback(transformer: any, data: any): void;
}
