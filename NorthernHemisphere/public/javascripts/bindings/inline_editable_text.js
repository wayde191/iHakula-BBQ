ko.bindingHandlers.inlineEditableText = {
  init: function(element, valueAccessor, allBindings, viewModel){
    var inputObservable = valueAccessor();
    $(element).addClass('inline_editable_text');
    appendSpanToElement(inputObservable, element, allBindings);
    appendInputToElement(inputObservable, element, allBindings);
    beginInlineTextEditingTextOnClick(element, viewModel);
    endInlineTextEditing(element);
  },

  update: function(element, valueAccessor, allBindings){
      if(!allBindings().valueBinding) {
          var inputObservable = valueAccessor();
          $(element).find("span").text(inputObservable());
          $(element).find("input").val(inputObservable());
      }
  }

};

function endInlineTextEditing(element) {
    $(element).find("input").on('blur', function () {
        $(this).hide();
        $(element).find("span").show();
    });
    ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
        $(element).find("input").remove();
        $(element).unbind();
    });
}

function beginInlineTextEditingTextOnClick(element, viewModel) {
    $(element).find("span").on('click', function () {
        $(this).hide();
        $(element).find("input").show();
        $(element).find("input").focus();
        viewModel.isDirty(true);
    });

}

function appendSpanToElement(inputObservable, element, allBindings){
    var span = $("<span />");
    if(allBindings().valueBinding){
        span.attr('data-bind', allBindings().valueBinding());
    }
    else{
       span.text(inputObservable());
    }
    $(element).append(span);
}

function appendInputToElement(inputObservable, element, allBindings) {
    var input = $('<input class="inline-edit-input" maxlength="255"/>');

    if(allBindings().valueBinding){
        input.attr('data-bind', allBindings().valueBinding());
    }
    else{
        input.val(inputObservable());
        input.change(function () {
            inputObservable(input.val());
        });
    }

    $(input).attr('type', 'text');
    input.hide();
    $(element).append(input);
}

