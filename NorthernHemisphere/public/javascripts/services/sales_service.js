var ajax = require('../ajax_wrapper');

module.exports = {

    getAllSaleRecords: function () {
        var deferred = $.Deferred();

        ajax.getJsonWithPromise('/sale/records')
            .done(function (records) {
                deferred.resolve(records);
            });
        return deferred.promise();
    }
};