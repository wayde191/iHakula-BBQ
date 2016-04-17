$(document).ready(function () {
    ko.validation.init({
        grouping : { deep: false, observable: true },
        decorateInputElement: true,
        registerExtenders: true
    });
});