var domReady = require('domready'),
    routeConfig = require('./config/routes'),
    router;

module.exports.homePageViewModelFactory = require("./view_models/home_page_view_model_factory");
module.exports.activityPageViewModelFactory = require("./view_models/activity_page_view_model_factory");
module.exports.joinActivityPageViewModelFactory = require("./view_models/join_activity_page_view_model_factory");
module.exports.databaseUpdateViewModelFactory = require("./view_models/database_update_view_model_factory");

domReady(function () {
    router = routeConfig.configure();
    module.exports.router = router;
});

