function appendSelectOptionsAndInitialValue(inputOption, inputObservable, $element) {
    var $newSelect = $('<select />').attr('id', 'inline_dropdown');

    _.each(inputOption, function (input) {
        $newSelect.append($('<option />').val(input).text(input));
    });
    $newSelect.change(function () {
        inputObservable($newSelect.val());
    });

    $newSelect.val(inputObservable());
    $newSelect.hide();
    $element.after($newSelect);

    return $newSelect;
}
function beginInlineEditingOnClick($element, $newSelect, viewModel) {
    if ($(window).innerWidth() > 768) {
        $element.hide();
        viewModel.isDirty(true);
        $newSelect.show();
        $newSelect.focus();
    }
}
function endInlineEditing($newSelect, $element) {
    $newSelect.on('blur', function () {
        $newSelect.remove();
        $element.show();
    });

    ko.utils.domNodeDisposal.addDisposeCallback($newSelect, function () {
        $newSelect.remove();
    });
}
ko.bindingHandlers.inlineEditable = {
    init: function (element, valueAccessor, allBindings, viewModel) {
        var $element = $(element);
        $element.click(function () {
            $element.addClass('inline_editable');
            var inputObservable = valueAccessor();
            var inputOption = allBindings().inputOptions();
            var $newSelect = appendSelectOptionsAndInitialValue(inputOption, inputObservable, $element, viewModel);
            beginInlineEditingOnClick($element, $newSelect, viewModel);
            endInlineEditing($newSelect, $element);
        });
    },

    update: function (element, valueAccessor) {
        var inputObservable = valueAccessor();
        var $element = $(element);
        $element.find("span").text(inputObservable());
        $element.find("select").val(inputObservable());
    }
};