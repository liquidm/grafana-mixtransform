import { QueryCtrl } from 'app/plugins/sdk';
export default class MixTransformQueryCtrl extends QueryCtrl {
    static templateUrl: string;
    target: any;
    errors: any;
    queryTypes: string[];
    constructor($scope: any, $injector: any, $q: any);
    validate(): "" | "Incorrect query type";
    onBlur(): void;
    getCollapsedText(): string;
}
