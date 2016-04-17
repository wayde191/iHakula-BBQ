module.exports = (function () {

    function getFirstMondayFrom(date) {
        var firstMonday = date.clone();
        if (firstMonday.day() !== 1) {
            firstMonday.day(8);
        }
        return firstMonday;
    }

    function getWorkingDaysInFirstWeek(date) {
        var workingDays = 0;
        if (date.day() > 1 && date.day() < 6) {
            workingDays = 6 - date.isoWeekday();
        }
        return workingDays;
    }

    function getLastMondayFrom(date) {
        var lastMonday = date.clone();
        if (lastMonday.day() !== 1) {
            return lastMonday.day(1);
        }

        return lastMonday;
    }

    function getWorkingDaysInLastWeek(date) {
        var workingDays = 5;
        if (date.day() > 0 && date.day() < 6) {
            workingDays = date.isoWeekday();
        }
        return workingDays;
    }

    function isWeekDay(currentDay) {
        var dayOfTheWeek = currentDay.format('dddd');
        return dayOfTheWeek !== 'Sunday' && dayOfTheWeek !== 'Saturday';
    }

    function countWeekdaysBetweenInterval(startDate, endDate) {
        var count = 0;

        var currentDay = startDate.clone();
        while (currentDay.diff(endDate, 'days') <= 0) {
            if (isWeekDay(currentDay))
                count++;
            currentDay = currentDay.add(1, 'days');
        }
        return count;
    }

    function getNumberOfWholeWeeks(startDate, endDate) {
        var firstMondayInDateRange = getFirstMondayFrom(startDate);
        var lastMondayInDateRange = getLastMondayFrom(endDate);
        var wholeWeeks = lastMondayInDateRange.diff(firstMondayInDateRange, 'weeks');
        return wholeWeeks;
    }

    return {
        calculate: function (start, end) {
            var startDate = start.clone().startOf('day');
            var endDate = end.clone().startOf('day');

            var numberOfWeeksSpanned = startDate.diff(endDate, 'weeks');

            if (numberOfWeeksSpanned <= 1) {
                return countWeekdaysBetweenInterval(startDate, endDate);
            } else {
                var workingDaysInFirstWeek = getWorkingDaysInFirstWeek(startDate);
                var workingDaysInLastWeek = getWorkingDaysInLastWeek(endDate);
                var workingDaysForWholeWeeks = getNumberOfWholeWeeks(startDate, endDate) * 5;

                return workingDaysForWholeWeeks + workingDaysInFirstWeek + workingDaysInLastWeek;
            }
        }
    };
})();