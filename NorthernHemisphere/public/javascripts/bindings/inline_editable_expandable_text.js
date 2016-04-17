ko.bindingHandlers.inlineEditableExpandableText = {
    init: function (element, valueAccessor, allBindings, viewModel) {
        var textareaObservable = valueAccessor();
        $(element).addClass('inline_editable_expandable_text');
        addSpanToElement(textareaObservable, element);
        addTextareaToElement(textareaObservable, element);
        beginInlineTextareaEditingTextOnClick(element, viewModel);
        endInlineTextareaEditing(element);
    },

    update: function (element, valueAccessor) {
        var textareaObservable = valueAccessor();
        $(element).find("span").text(textareaObservable());
        $(element).find("textarea").val(textareaObservable());
    }
};

function endInlineTextareaEditing(element) {
    $(element).find("textarea").on('blur', function () {
        $(this).hide();
        $(element).find("span").show();
    });
    ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).find("textarea").remove();
        $(element).unbind();
    });
}

function beginInlineTextareaEditingTextOnClick(element, viewModel) {
    $(element).find("span").on('click', function () {
        $(this).hide();
        $(element).find("textarea").show();
        $(element).find("textarea").focus();
        viewModel.isDirty(true);
    });
}

function addSpanToElement(textareaObservable, element) {
    var span = $("<span />");
    span.text(textareaObservable());
    $(element).append(span);
}

function addTextareaToElement(textareaObservable, element) {
    var textarea = $('<textarea class="inline-edit-textarea" maxlength="255"/>');
    textarea.autosize({append: ''});
    textarea.val(textareaObservable()).trigger('autosize.resize');
    textarea.change(function () {
        textareaObservable(textarea.val());
    });

    $(textarea).attr('type', 'text');
    textarea.hide();
    $(element).append(textarea);
}

