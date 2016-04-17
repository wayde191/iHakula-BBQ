var moneyFormatter = require('../presentation/money_formatter');
var currencyCodes = require('../model/currency_codes');

var monetaryValueBinding = {

    init: function (element, valueAccessor, allBindings) {
        $(element).on('keyup input change', function () {
            var originalFormattedValue = $(element).val();
            var amount = valueAccessor();
            var reformattedValue;

            if (originalFormattedValue) {
                reformattedValue = moneyFormatter.formatFromInput(originalFormattedValue, allBindings().currency_code());
                amount(String(accounting.unformat(reformattedValue)));
            }

            if (!moneyFormatter.isPartialButValid(originalFormattedValue, allBindings().currency_code())) {
                if ($(element).is('input')) {
                    $(element).val(reformattedValue);
                } else {
                    $(element).text(accounting.formatMoney(reformattedValue, currencyCodes.currencySymbolForCurrencyCode(allBindings().currency_code())));
                }
            }
            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).unbind();
            });
        });
    },

    update: function (element, valueAccessor, allBindings) {
        var unformattedValue = ko.unwrap(valueAccessor());
        var displayAmount = valueIsEmpty(unformattedValue) ?
            '' : moneyFormatter.formatFromInput(String(unformattedValue), allBindings().currency_code());

        if ($(element).is('input')) {
            $(element).val(displayAmount);
        } else {
            $(element).text(accounting.formatMoney(displayAmount, currencyCodes.currencySymbolForCurrencyCode(allBindings().currency_code())));
        }
    }
};

function valueIsEmpty(unformattedValue) {
    return (typeof unformattedValue === "undefined" || String(unformattedValue) === 'null' || unformattedValue === '');
}
ko.bindingHandlers.monetaryValue = monetaryValueBinding;
ko.validation.makeBindingHandlerValidatable('monetaryValue');

module.exports = monetaryValueBinding;
