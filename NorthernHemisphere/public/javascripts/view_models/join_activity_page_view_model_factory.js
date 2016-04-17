var JoinActivityPageViewModel = require('./joinactivitypage_view_model');

module.exports = {
    applyToPage: function(openId, activityId) {
        var sfView = document.getElementById('sf-view');
        var mainPage = document.getElementById('main-page');
        mainPage.innerHTML = sfView.innerHTML;
        ko.applyBindings(new JoinActivityPageViewModel(openId, activityId), mainPage);
    }
};