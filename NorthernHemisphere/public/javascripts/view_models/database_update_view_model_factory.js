var DatabaseViewModel = require('./database_update_view_model');

module.exports = {
    applyToPage: function() {
        var sfView = document.getElementById('sf-view');
        ko.applyBindings(new DatabaseViewModel(), sfView);
    }
};