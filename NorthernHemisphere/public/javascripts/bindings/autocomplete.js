var account_matcher = require('../account_matcher');

var autocomplete = {

    init: function (element, valueAccessor) {
        var changeTargetValue = function () {
            var targetIdObservable = valueAccessor().targetId,
                targetNameObservable = valueAccessor().targetName,
                selectedValue = $(element).val();

            var list = valueAccessor().listName();

            var listItem = _.find(list, function (listItem) {
                return listItem.name === selectedValue;
            });

            if (listItem) {
                targetIdObservable(listItem.id);
                targetNameObservable(listItem.name);
            } else {
                targetIdObservable(undefined);
                targetNameObservable(selectedValue);
            }
        };

        var changeTargetValueOnlyIfEmpty = function () {
            var value = $(element).val();
            if (value === '') {
                changeTargetValue();
            }
        };

        var assertValueWithinSuggestions = function (suggestions) {
            var suggestedValues = valueAccessor().suggestedValues;
            suggestedValues([]);

            _.each(suggestions, function (suggestion) {
                suggestedValues.push(suggestion.value);
            });

        };

        var updateTheTargetOnSelectBecauseIOS7FiresEventsAtTheWrongTimes = function (selected_value) {
            valueAccessor().targetName(selected_value);
        };

        var appendToElement = '#autocomplete-account-results';
        if(valueAccessor().appendResultsTo) {
            appendToElement = '#' + valueAccessor().appendResultsTo();
        }

        $(element).autocomplete({
            source: function (request, response) {
                var list = valueAccessor().listName();
                var matches = account_matcher.getMatches(request.term, list);

                var matchNames = _.map(matches, function (match) {
                    return match.name;
                });

                response(matchNames);
            },
            autoFocus: true,
            minLength: 2,
            appendTo: appendToElement,
            response: function (event, ui) {
                assertValueWithinSuggestions(ui.content);
            },
            select: function (event, ui) {
                updateTheTargetOnSelectBecauseIOS7FiresEventsAtTheWrongTimes(ui.item.value);
            },
            focus: function (event, ui) {
                var menu = $(this).data('ui-autocomplete').menu.element,
                    focused = menu.find('li:has(a.ui-state-focus)'),
                    notFocused = menu.find('li:not(:has(a.ui-state-focus))');

                notFocused.removeClass('autocomplete-item--active');
                focused.addClass('autocomplete-item--active');
            }
        });

        $(element).keydown (function(event, ui){
            if(event.keyCode !== 13) {
                ko.postbox.publish('account-name.edited', valueAccessor().targetId);
            }
        });

        ko.utils.registerEventHandler(element, 'autocompleteselect', changeTargetValue);
        ko.utils.registerEventHandler(element, 'autocompletechange', changeTargetValue);
        ko.utils.registerEventHandler(element, 'autocompleteclose', changeTargetValue);
        ko.utils.registerEventHandler(element, 'change', changeTargetValueOnlyIfEmpty);
    },

    update: function (element, valueAccessor) {
        var targetValue = valueAccessor().targetName();
        $(element).val(targetValue);
    }

};

ko.bindingHandlers.autocomplete = autocomplete;
ko.validation.makeBindingHandlerValidatable('autocomplete');

module.exports = autocomplete;