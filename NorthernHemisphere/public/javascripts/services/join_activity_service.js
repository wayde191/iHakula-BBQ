var ajax = require('../ajax_wrapper');

module.exports = {

    getUserActivityStatus: function (openId, activityId) {
        var deferred = $.Deferred();

        var params = 'ihakula_request=ihakula_northern_hemisphere'
            + '&open_id=' + openId
            + '&activity_id=' + activityId;
        ajax.getJsonWithPromise('/weixin/get/user/activity/status?' + params)
            .done(function (userActivityInfo) {
                deferred.resolve(userActivityInfo);
            });
        return deferred.promise();
    },

    drawPrize: function (openId, activityId) {
        var deferred = $.Deferred();

        var params = openId + '/' + activityId +  '?ihakula_request=ihakula_northern_hemisphere';
        ajax.getJsonWithPromise('/weixin/user/draw/prize/' + params)
            .done(function (userActivityInfo) {
                deferred.resolve(userActivityInfo);
            });
        return deferred.promise();
    }
};