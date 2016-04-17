ko.bindingHandlers.expandableTextArea = {
    init: function (element, valueAccessor) {  //DOM -> Model
        $(element).autosize({append: ''});

        function notifyViewModelOfChange() {
            var observable = valueAccessor(),
                comments = $(element).val();
            observable(comments);
        }

        ko.utils.registerEventHandler(element, 'keyup', notifyViewModelOfChange);
    },
    update: function(element, valueAccessor){  //Model -> DOM
        var comments = ko.utils.unwrapObservable(valueAccessor());
        $(element).val(comments).trigger('autosize.resize');
    }
};
