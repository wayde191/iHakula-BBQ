ko.bindingHandlers.date = {
    update: function (element, valueAccessor) {
        var value = valueAccessor();
        var valueUnwrapped = ko.utils.unwrapObservable(value);

        var pattern = 'DD MMM YYYY';

        var output = "-";
        if (valueUnwrapped !== null && valueUnwrapped !== undefined && valueUnwrapped.length > 0) {
            output = moment(valueUnwrapped).format(pattern);
        }

        if ($(element).is("input")) {
            $(element).val(output);
        } else {
            $(element).text(output);
        }
    }
};