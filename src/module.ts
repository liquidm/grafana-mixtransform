import MixTransformDatasource from './datasource';
import MixTransformQueryCtrl from './query_ctrl';

class MixTransformConfigCtrl {
    static templateUrl = 'partials/config.html';
}

export {
    MixTransformDatasource as Datasource,
    MixTransformQueryCtrl as QueryCtrl,
    MixTransformConfigCtrl as ConfigCtrl
};