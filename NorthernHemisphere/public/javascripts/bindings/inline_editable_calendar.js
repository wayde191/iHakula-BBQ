ko.bindingHandlers.inlineEditableCalendar = {
    init: function (element, valueAccessor, allBindings, viewModel) {
        var observable = valueAccessor();

        function setMaxDate() {
            if (allBindings.get("max_date") !== undefined) {
                var maxDate = allBindings.get("max_date");

                maxDate = moment(maxDate()).toDate();

                $(element).pickadate('picker').set({
                    max: maxDate
                });
            }
        }

        function setMinDate() {
            if (allBindings.get("min_date") !== undefined) {
                var minDate = allBindings.get("min_date");

                minDate = moment(minDate()).toDate();

                $(element).pickadate('picker').set({
                    min: minDate
                });
            }
        }

        function showDatePicker() {
            $(element).pickadate({
                format: 'dd mmm yyyy',
                formatSubmit: 'yyyy-mm-dd',
                today: '',
                clear: '',
                disable: [],
                selectYears: true,
                onOpen: function () {
                    if (viewModel.isDirty) {
                        setViewModelDirty();
                    }
                },
                onClose: function () {
                    onCloseOfPicker();
                }
            });
            var newDate = moment(observable()).toDate();
            $(element).pickadate('picker').set('select', newDate);
            $(element).pickadate('picker').open();
            setMaxDate();
            setMinDate();
        }

        function initialiseOnClickOfDate() {
            $(element).click(showDatePicker);
        }

        function setViewModelDirty() {
            viewModel.isDirty(true);
        }

        function onCloseOfPicker() {
            $(element).pickadate('picker').stop();
            initialiseOnClickOfDate();
        }

        initialiseOnClickOfDate();

        function notifyViewModelOfDateChange() {
            var observable = valueAccessor(),
                selectedDate = $(element).pickadate('picker').get();
            observable(selectedDate);
        }

        ko.utils.registerEventHandler(element, 'change', notifyViewModelOfDateChange);
    }
};
