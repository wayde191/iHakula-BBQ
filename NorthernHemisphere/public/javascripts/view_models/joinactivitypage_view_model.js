var sales_service = require('../services/join_activity_service.js');
var qrCode = require('qrcode-npm');

module.exports = (function () {
    'use strict';
    var self;

    function JoinactivitypageViewModel(openId, activityId) {

        self = this;
        self.openId = openId;
        self.activityId = activityId;

        this.ACTIVITY_IS_GOING = 600;
        this.ACTIVITY_NOT_FOUND = 601;
        this.ACTIVITY_IS_OVER = 602;
        this.ACTIVITY_NOT_START = 603;
        this.ACTIVITY_HAS_JOINED = 604;
        this.ACTIVITY_CREATE_SUCC = 900;

        self.shakeEvent = new Shake({threshold: 15});
        self.userActivity = {};
        self.prize = {};

        self.messageType = ko.observable();
        self.messageContent = ko.observable();
        self.couponId = ko.observable();
        self.prizeName = ko.observable();
        self.joinedTime = ko.observable();
        self.endDate = ko.observable();

        self.isLoading = ko.observable(true);
        self.isFirstTime = ko.observable(false);
        self.hasJoined = ko.observable(false);
        self.wonCoupon = ko.observable(false);
        self.showMessage = ko.observable(false);

        self.initialise();
    };

    JoinactivitypageViewModel.prototype.dispatcherWonPrize = function(){
        var self = this;
        self.isLoading(false);

        var status = self.prize.status;
        switch(status){
            case self.ACTIVITY_HAS_JOINED:
                self.showHasJoinedMessage();
                break;
            case self.ACTIVITY_CREATE_SUCC:
                self.wonPrize();
                break;
            default:

        }
    };

    JoinactivitypageViewModel.prototype.dispatcher = function(){
        var self = this;
        self.isLoading(false);

        var status = self.userActivity.status;
        switch(status){
            case self.ACTIVITY_IS_GOING:
                if(self.userActivity.go_shake == 'yes'){
                    self.showShake();
                }
                break;
            case self.ACTIVITY_NOT_FOUND:
                self.showNotFound();
                break;
            case self.ACTIVITY_IS_OVER:
                self.showActivityIsOver();
                break;
            case self.ACTIVITY_NOT_START:
                self.showActivityIsNotStartYet();
                break;
            case self.ACTIVITY_HAS_JOINED:
                self.showHasJoinedMessage();
                break;
            case self.ACTIVITY_CREATE_SUCC:
                self.wonPrize();
                break;
            default:

        }
    };

    JoinactivitypageViewModel.prototype.restore = function(){
        var self = this;
        self.isFirstTime(false);
        self.hasJoined(false);
        self.wonCoupon(false);
        self.showMessage(false);
    };

    JoinactivitypageViewModel.prototype.wonPrize = function(){
        var self = this;
        self.restore();
        self.wonCoupon(true);
        self.prizeName(self.prize.name);
        self.couponId(self.prize.code);
        self.endDate(self.prize.end_date);

        self.drawQRCode(self.prize.code);
    };

    JoinactivitypageViewModel.prototype.drawQRCode = function(code){
        var qr = qrCode.qrcode(10, 'H');
        qr.addData(code);
        qr.make();

        var imgTag = qr.createImgTag();
        document.getElementById("qrcode").innerHTML = imgTag;
    };

    JoinactivitypageViewModel.prototype.showShake = function(){
        console.log('showShake');
        var self = this;
        self.restore();
        self.isFirstTime(true);
        self.startShakeSubscriber();

        $("#shakeButton").bind("click",function(){
            self.shakeEventDidOccur();
        });
    };

    JoinactivitypageViewModel.prototype.shakeEventDidOccur = function(){
        var self = this;
        var audio = document.getElementById("shake-sound-male");
        if (audio.paused) {
            audio.play();
        } else {
            audio.currentTime = 0;
        }
        self.stopShakeSubscriber();

        self.drawForAPrice();
    };

    JoinactivitypageViewModel.prototype.startShakeSubscriber =  function(){
        var self = this;
        self.shakeEvent.start();
        window.addEventListener('shake', self.shakeEventDidOccur.bind(self), false);
    };

    JoinactivitypageViewModel.prototype.stopShakeSubscriber =  function(){
        var self = this;
        self.shakeEvent.stop();
        window.removeEventListener('shake', self.shakeEventDidOccur, false);
    };

    JoinactivitypageViewModel.prototype.showHasJoinedMessage = function(){
        var self = this;
        self.restore();
        self.hasJoined(true);
        self.prizeName(self.userActivity.coupon.name);
        self.couponId(self.userActivity.coupon.code);
        self.joinedTime(self.userActivity.coupon.start_date.replace('T', ' '));
    };

    JoinactivitypageViewModel.prototype.showUserMessage = function(type, content){
        var self = this;
        self.restore();
        self.showMessage(true);
        self.messageType(type);
        self.messageContent(content);
    };

    JoinactivitypageViewModel.prototype.showActivityIsNotStartYet = function(){
        var self = this;
        self.showUserMessage(
            "活动序号为：" + self.activityId + " 的活动还没有开始",
            "请回复数字：1 查询当前活动"
        );
    };

    JoinactivitypageViewModel.prototype.showActivityIsOver = function(){
        var self = this;
        self.showUserMessage(
            "活动序号为：" + self.activityId + " 的活动已经结束",
            "请回复数字：1 查询当前活动"
        );
    };

    JoinactivitypageViewModel.prototype.showNotFound = function(){
        var self = this;
        self.showUserMessage(
            "活动序号为：" + self.activityId + " 的活动不存在",
            "请回复数字：1 查询当前活动"
        );
    };

    JoinactivitypageViewModel.prototype.initialise = function () {
        if(self.openId == 'ihakula_create_coupon') {
            self.isLoading(false);
            var couponInfo = self.activityId.split(':');
            self.prize = {
                name: couponInfo[0],
                code: couponInfo[1],
                end_date: couponInfo[2],
                start_date: couponInfo[3]
            };
            self.wonPrize();
        } else {
            self.isLoading(true);
            return sales_service.getUserActivityStatus(self.openId, self.activityId)
                .done(function (data) {
                    self.userActivity = data;
                    self.dispatcher();
                });
        }
    };

    JoinactivitypageViewModel.prototype.drawForAPrice = function(){
        self.isLoading(true);
        return sales_service.drawPrize(self.openId, self.activityId)
            .done(function (data) {
                self.prize = data;
                self.dispatcherWonPrize();
            });
    };

    return JoinactivitypageViewModel;
})();