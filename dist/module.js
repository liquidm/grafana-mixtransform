System.register(["./datasource", "./query_ctrl"], function (exports_1, context_1) {
    "use strict";
    var datasource_1, query_ctrl_1, MixTransformConfigCtrl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            }
        ],
        execute: function () {
            exports_1("Datasource", datasource_1.default);
            exports_1("QueryCtrl", query_ctrl_1.default);
            MixTransformConfigCtrl = (function () {
                function MixTransformConfigCtrl() {
                }
                MixTransformConfigCtrl.templateUrl = 'partials/config.html';
                return MixTransformConfigCtrl;
            }());
            exports_1("ConfigCtrl", MixTransformConfigCtrl);
        }
    };
});
//# sourceMappingURL=module.js.map