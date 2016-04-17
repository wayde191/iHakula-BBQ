ko.bindingHandlers.saveButton = {

    update: function (element, valueAccessor) {
        var saveButton = $(element),
            isSaving = ko.unwrap(valueAccessor().isSaving),
            savingEnabled = ko.unwrap(valueAccessor().savingEnabled),
            spinnerClass = ko.unwrap(valueAccessor().spinnerClass);

        var indicateSaveInProgress = function() {
            saveButton.attr('disabled', 'disabled');
            saveButton.attr('state', 'saving');
            saveButton.addClass(spinnerClass);
        };

        var indicateSavingEnabled = function() {
            saveButton.removeAttr('disabled');
            saveButton.attr('state', 'enabled');
            saveButton.removeClass(spinnerClass);
        };
        var indicateSavingDisabled = function() {
            saveButton.attr('disabled', 'disabled');
            saveButton.attr('state', 'disabled');
            saveButton.removeClass(spinnerClass);
        };

        if(isSaving === true) {
            indicateSaveInProgress();
        }
        else if (savingEnabled === true){
            indicateSavingEnabled();
        }
        else {
            indicateSavingDisabled();
        }
    }
};