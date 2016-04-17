ko.bindingHandlers.sectionActive = {

    update: function (element, valueAccessor) {
        var isEditing = ko.utils.unwrapObservable(valueAccessor());

        if(isEditing === true) {
            $(element).addClass('staffing-role-container--active');
        }
        else {
            $(element).removeClass('staffing-role-container--active');
        }
    }
};