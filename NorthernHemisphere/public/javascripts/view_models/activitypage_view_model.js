var sales_service = require('../services/activity_service.js');

module.exports = (function () {
    'use strict';
    var self;

    function HomepageViewModel() {
        self = this;
        self.usersIdArr = null;
        self.usersDetailDic = null;
        self.usersSaleDic = null;
        self.accountFieldArr = null;
        self.accountFieldDetailArr = null;
        self.activities = ko.observableArray([]);
        self.userFinacial = ko.observableArray([]);
        self.isLoading = ko.observable(true);

        self.initialise();

        self.cacheCaches = function(data){
            self.usersIdArr = data["users"].split(",");
            self.usersDetailDic = data["users_detail_info"];
            self.usersSaleDic = data["users_sale_records"];
            self.accountFieldArr = data["account_field"];
            self.accountFieldDetailArr = data["account_field_detail"];
        };

        self.caculateRecords = function(){
            var allRecords = [];
            var totalEarn = 0.0;
            var totalCost = 0.0;
            var userCostAndEarn = [];
            _.each(self.usersIdArr, function(userId){
                var userEarn = 0.0;
                var userCost = 0.0;
                var userName = self.usersDetailDic[userId]['user_nickname'];
                var personRecords = self.usersSaleDic[userId];
                _.each(personRecords, function (record) {
                    var item = getFieldByFieldID(record.field_id)[0];
                    var itemDetail = getFieldDetailByFieldDetailId(record.field_detail_id)[0];
                    var startSign = item.type ? '(+) ' : '(-) ';
                    var text = startSign;
                    if (item.type) {
                        userEarn += record.money;
                    } else {
                        userCost += record.money;
                    }
                    text += item.field + ':' + itemDetail.name + ' ' + record.money + '(CNY); ' + record.description;
                    allRecords.push({
                        'text': text,
                        'date': record.date,
                        'money': startSign + record.money,
                        'user': userName
                    });
                });
                userCostAndEarn.push({
                    'text': userName,
                    'totalCost': userCost,
                    'totalEarn': userEarn,
                    'revenue': (userEarn - userCost).toFixed(2)
                });
                totalCost += userCost;
                totalEarn += userEarn;
            });

            self.userFinacial([{
                'text': '合计',
                'totalCost': totalCost,
                'totalEarn': totalEarn,
                'revenue': (totalEarn - totalCost).toFixed(2)
            }].concat(userCostAndEarn));

            var sortedRecords = _.chain(allRecords)
                .sortBy(function (record) {
                    return record.date;
                })
                .reverse()
                .value();
            self.saleRecords(sortedRecords);
        };

        function getFieldByFieldID (fieldId){
            return _.filter(self.accountFieldArr, function(field){
                return field["ID"] === fieldId;
            });
        };

        function getFieldDetailByFieldDetailId (detailId){
            return _.filter(self.accountFieldDetailArr, function(field){
                return field["ID"] === detailId;
            });
        };
    };

    HomepageViewModel.prototype.initialise = function () {
        return sales_service.getAllActivities()
            .done(function (data) {
                console.log(data);
                self.cacheCaches(data);
                self.caculateRecords();
                self.isLoading(false);
            });
    };

    return HomepageViewModel;
})();