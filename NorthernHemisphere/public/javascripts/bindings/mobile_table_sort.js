ko.bindingHandlers.mobileTableSort = {
    update: function (element, valueAccessor) {
        var fieldToSortBy = ko.utils.unwrapObservable(valueAccessor());
        if(fieldToSortBy === undefined) {
            return;
        }

        var ASC_CODE = '\u2191';
        var DESC_CODE = '\u2193';
        var SORT_ASC = 0;
        var SORT_DESC = 1;

        var length = fieldToSortBy.length;
        var lastCharacter = fieldToSortBy[length - 1];
        var sortOrder = SORT_ASC;

        if(lastCharacter === ASC_CODE || lastCharacter === DESC_CODE){
            sortOrder = (lastCharacter === DESC_CODE) ?  SORT_DESC : SORT_ASC;
            fieldToSortBy = fieldToSortBy.slice(0,-2);
        }

        var fieldsByIndex = {
            "Role": 0, "Grade": 1, "Working office": 2, "Rate": 3, "Start date": 4, "End date": 5, "Assignee": 6
        };


        var sorting = [
            [fieldsByIndex[fieldToSortBy] , sortOrder]
        ];

        $(".staffing_request_table").trigger("sorton", [sorting]);
    }
};
