ko.bindingHandlers.percentage = {
    init: function (element, valueAccessor) {
        $(element).on('change', function () {
            var value = valueAccessor();
            value(getElementValueAsInt(element));
            $(element).val(value());
        });

        ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
            $(element).remove();
        });
    },

    update: function (element, valueAccessor) {
        var valueUnwrapped = valueAccessor()();

        var value = restrictPercentageValues(valueUnwrapped);
        if ($(element).is("input")) {
            $(element).val(value);
        } else {
            $(element).text(value + '%');
        }
    }
};


function restrictPercentageValues(valueUnwrapped) {
    function isNaNButNotUndefined() {
        return valueUnwrapped !== undefined && isNaN(valueUnwrapped);
    }

    if (isNaNButNotUndefined()) {
        return 0;
    }
    var minPercentValue = restrictedMinimumValue(valueUnwrapped);
    return restrictMaxValue(minPercentValue);
}

function restrictedMinimumValue(valueUnwrapped) {
    return valueUnwrapped < 0 ? 0 : valueUnwrapped;
}

function restrictMaxValue(restrictedValue) {
    return restrictedValue > 100 ? 100 : restrictedValue;
}

function getElementValueAsInt(element) {
    var pattern = /[\D][.\d]*/;
    var intValue = parseInt($(element).val().replace(pattern, ''));
    return restrictPercentageValues(intValue);
}