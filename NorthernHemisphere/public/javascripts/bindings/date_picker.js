ko.bindingHandlers.datePicker = {

    init: function (element, valueAccessor, allBindings, viewModel) {

        var config = {
                today: moment().toDate(),
                textToHideButton: ''
            },
            notifyViewModelOfDateChange = function () {
                var observable = valueAccessor(),
                    selectedDate = $(element).pickadate('picker').get();

                observable(selectedDate);
            };

        var disable = [];

        function setViewModelDirty() {
            viewModel.isDirty(true);
        }

        $(element).pickadate({
            format: 'dd mmm yyyy',
            formatSubmit: 'yyyy-mm-dd',
            today: config.textToHideButton,
            clear: config.textToHideButton,
            disable: disable,
            selectYears: true,
            onOpen: function () {
                $(element).blur();
                if (viewModel.isDirty) {
                    setViewModelDirty();
                }
            }
        });


        ko.utils.registerEventHandler(element, 'change', notifyViewModelOfDateChange);

        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(element).unbind();
        });

    },

    update: function (element, valueAccessor, allBindings) {
        var newDateString = ko.utils.unwrapObservable(valueAccessor());
        var maxDate, minDate;
        if (allBindings.get("start_date") !== undefined && allBindings.get("end_date") !== undefined) {
            minDate = moment(allBindings.get("start_date")).toDate();
            maxDate = moment(allBindings.get("end_date")).toDate();

            disable = [
                true,
                {from: minDate, to: maxDate}
            ];
        }

        if (newDateString) {
            var newDate = moment(newDateString).toDate();
            $(element).pickadate('picker').set('select', newDate);
        } else {
            $(element).pickadate('picker').set('clear');
        }

        if (allBindings.get("max_date") !== undefined) {
            maxDate = allBindings.get("max_date");

            maxDate = moment(maxDate()).toDate();

            $(element).pickadate('picker').set({
                max: maxDate
            });
        }

        if (allBindings.get("min_date") !== undefined) {
            minDate = allBindings.get("min_date");
            minDate = moment(minDate()).toDate();

            $(element).pickadate('picker').set({
                min: minDate
            });
        }

        if (allBindings.get("start_date") !== undefined && allBindings.get("end_date") !== undefined) {
            var startDate = allBindings.get("start_date");
            var endDate = allBindings.get("end_date");

            minDate = moment(startDate).toDate();
            maxDate = moment(endDate).toDate();

            $(element).pickadate('picker').set({
                min: minDate,
                max: maxDate
            });
        }
    }
};