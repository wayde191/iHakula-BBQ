ko.bindingHandlers.probabilitySlider = {

    init: function (element, valueAccessor) {

        function notifyViewModelOfChange() {
            var observable = valueAccessor(),
                selectedProbability = $(element).val();

            observable(selectedProbability);
        }

        function addSliderToLabels() {
            var lower_bound = $('<label>0%</label>');
            lower_bound.addClass('slider-label');
            lower_bound.addClass('slider-label__lower-bound');

            var upper_bound = $('<label>100%</label>');
            upper_bound.addClass('slider-label');
            upper_bound.addClass('slider-label__upper-bound');

            $(element).append(lower_bound);
            $(element).append(upper_bound);
        }

        $(element).noUiSlider({
            start: 0,
            range: {
                'min': 0,
                'max': 100
            },
            behaviour: 'drag',
            step: 5,
            serialization: {
                format: {
                    decimals: 0
                }
            }
        }).each(addSliderToLabels);

        ko.utils.registerEventHandler(element, 'slide', notifyViewModelOfChange);
    },

    update: function (element, valueAccessor) {
        var viewModelProbability = ko.utils.unwrapObservable(valueAccessor());

        if (viewModelProbability) {
            $(element).val(viewModelProbability);
        }
    }
};
