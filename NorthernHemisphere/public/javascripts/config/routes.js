var director = require('director'),
    viewEngine = require('../infrastructure/view_engine');

var routes = {
    "/weixin/join/activity/:open_id/:activity_id": function (openId, activityId) {
        viewEngine.bindView("/join-activity", {
            openId: openId,
            activityId: activityId
        });
    }
};

module.exports = {

    configure: function () {
        var router = new director.Router(routes);

        router.init();
        return router;
    }
};