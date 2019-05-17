System.register(["app/plugins/sdk"], function (exports_1, context_1) {
    "use strict";
    var __extends = (this && this.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var sdk_1, MixTransformQueryCtrl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            }
        ],
        execute: function () {
            MixTransformQueryCtrl = (function (_super) {
                __extends(MixTransformQueryCtrl, _super);
                function MixTransformQueryCtrl($scope, $injector, $q) {
                    var _this = _super.call(this, $scope, $injector) || this;
                    _this.queryTypes = [
                        "each",
                        "callback"
                    ];
                    if (!_this.target.queryType)
                        _this.target.queryType = _this.queryTypes[0];
                    if (typeof _this.target.code !== "string")
                        _this.target.code = "";
                    return _this;
                }
                MixTransformQueryCtrl.prototype.validate = function () {
                    if (this.queryTypes.indexOf(this.target.queryType) < 0)
                        return "Incorrect query type";
                    return '';
                };
                MixTransformQueryCtrl.prototype.onBlur = function () {
                    this.errors = this.validate();
                    this.refresh();
                };
                MixTransformQueryCtrl.prototype.getCollapsedText = function () {
                    return 'a function...';
                };
                MixTransformQueryCtrl.templateUrl = 'partials/query.editor.html';
                return MixTransformQueryCtrl;
            }(sdk_1.QueryCtrl));
            exports_1("default", MixTransformQueryCtrl);
        }
    };
});
//# sourceMappingURL=query_ctrl.js.map