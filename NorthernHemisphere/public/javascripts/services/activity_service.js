var ajax = require('../ajax_wrapper');

module.exports = {

    getAllActivities: function () {
        var deferred = $.Deferred();

        ajax.getJsonWithPromise('/weixin/get/all/activities')
            .done(function (activities) {
                deferred.resolve(activities);
            });
        return deferred.promise();
    }
};