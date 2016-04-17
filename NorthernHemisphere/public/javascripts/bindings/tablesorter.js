$(function () {
    var previousElement;

    ko.bindingHandlers.tablesorter = {
        init: function (element, valueAccessor, allBindings) {
            var collection = valueAccessor();
            var key = allBindings().sortKey;
            $(element).addClass('tablesorter-headerUnSorted');

            $(element).on('click', function () {


                if (!!previousElement && previousElement !== element) {
                    $(previousElement).removeClass('tablesorter-headerDesc');
                    $(previousElement).removeClass('tablesorter-headerAsc');
                    $(previousElement).addClass('tablesorter-headerUnSorted');
                }

                if (collection.currentOrdering() === collection.DESCENDING || collection.currentOrdering() === collection.UNSORTED) {
                    $(element).removeClass('tablesorter-headerUnSorted');
                    $(element).removeClass('tablesorter-headerDesc');
                    $(element).addClass('tablesorter-headerAsc');

                    collection.sortOrder(collection.ASCENDING).sortKey(key).process();

                } else {

                    $(element).removeClass('tablesorter-headerUnSorted');
                    $(element).removeClass('tablesorter-headerAsc');
                    $(element).addClass('tablesorter-headerDesc');
                    collection.sortOrder(collection.DESCENDING).sortKey(key).process();
                }
                previousElement = element;
            });
            
            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).remove();
            });
        },
        update: function (element, valueAccessor, allBindings) {
            var collection = valueAccessor();
            var key = allBindings().sortKey;

            if (key === collection.currentSortKey()) {
                if (collection.currentOrdering() === collection.DESCENDING) {
                    $(element).removeClass('tablesorter-headerUnSorted');
                    $(element).removeClass('tablesorter-headerAsc');
                    $(element).addClass('tablesorter-headerDesc');

                } else {
                    $(element).removeClass('tablesorter-headerUnSorted');
                    $(element).removeClass('tablesorter-headerDesc');
                    $(element).addClass('tablesorter-headerAsc');
                }
            }
            else {
                    $(element).removeClass('tablesorter-headerAsc');
                    $(element).removeClass('tablesorter-headerDesc');
                    $(element).addClass('tablesorter-headerUnSorted');
            }
        }
    };
});

