ko.bindingHandlers.sectionSlider = {

    update: function (element, valueAccessor) {
        var isEditing = ko.utils.unwrapObservable(valueAccessor());

        if(isEditing === true) {
            $(element).slideDown();
        }
        else {
            $(element).slideUp();
        }
    }
};