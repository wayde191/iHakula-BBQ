var ActivityPageViewModel = require('./activitypage_view_model');

module.exports = {
    applyToPage: function() {
        var sfView = document.getElementById('sf-view');
        ko.applyBindings(new ActivityPageViewModel(), sfView);
    }
};