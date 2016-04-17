var viewResolver = require('./view_resolver'),
    viewModelResolver = require('./view_model_resolver');

function doBind(ViewModel, view, data) {
    'use strict';
    $(function () {
        ko.postbox.reset();
        var sfView = document.getElementById('sf-view');
        $(sfView).html(view);
        ko.cleanNode(sfView);
        ko.applyBindings(new ViewModel(data), sfView);
    });
}

function viewResolverComplete(routeName, view, data) {
    var viewModel = viewModelResolver.resolveViewModel(routeName);
    doBind(viewModel, view, data);
}

module.exports = {
    bindView: function (routeName, data) {

        return viewResolver.resolveView(routeName)
            .done(function (view) {
                viewResolverComplete(routeName, view, data);
            });
    }
};
