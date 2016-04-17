var HomePageViewModel = require('./homepage_view_model');

module.exports = {
    applyToPage: function() {
        var sfView = document.getElementById('sf-view');
        ko.applyBindings(new HomePageViewModel(), sfView);
    }
};