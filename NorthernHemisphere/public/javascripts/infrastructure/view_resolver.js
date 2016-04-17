var ajaxWrapper = require('../ajax_wrapper');

module.exports = (function () {
    'use strict';
    var viewBase = "/views/partials",
        viewBaseExtension = ".html",
        viewCache = {};

    return {
        resolveView: function (routeName) {
            var deferred = $.Deferred();

            if (viewCache.hasOwnProperty(routeName)) {
                var cachedView = viewCache[routeName];
                deferred.resolve($.parseHTML(cachedView));
            }
            else {
                ajaxWrapper.get(viewBase + routeName.toLowerCase() + viewBaseExtension)
                    .done(function (viewAsString) {
                        viewCache[routeName] = viewAsString;
                        deferred.resolve($.parseHTML(viewAsString));
                    })
                    .fail(function () {
                        deferred.reject('View not found at route');
                    });
            }
            return deferred.promise();
        }
    };
})();