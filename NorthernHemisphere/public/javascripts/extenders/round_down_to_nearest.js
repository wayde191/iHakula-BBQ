ko.extenders.roundDownToNearest = function (target, roundingInterval) {

    target.roundedValue = ko.computed(function () {
        var newValue = target();

        if(newValue) {
            var remainderToRemove = newValue % roundingInterval;
            target(newValue - remainderToRemove);
        }
    });

    return target;
};