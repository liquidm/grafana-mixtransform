///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import {QueryCtrl} from 'app/plugins/sdk';
import _ from "lodash";

export default class MixTransformQueryCtrl extends QueryCtrl {
    static templateUrl = 'partials/query.editor.html';

    target: any;
    errors: any;

    queryTypes = [
        "each",
        "callback"
    ];

    /** @ngInject **/
    constructor($scope, $injector, $q) {
        super($scope, $injector);
        if (!this.target.queryType) this.target.queryType = this.queryTypes[0];
        if (typeof this.target.code !== "string") this.target.code = "";

    }


    validate() {
        if (this.queryTypes.indexOf(this.target.queryType) < 0) return "Incorrect query type";

        return '';
    }

    onBlur() {

        this.errors = this.validate();
        this.refresh();
    }

    getCollapsedText() {
        return 'a function...'
    }
}