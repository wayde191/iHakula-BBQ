module.exports = (function ($) {
    "use strict";
    function getJsonWithPromise(url) {

        return $.getJSON(url);
    }

    function get(path) {
        return $.get(path);
    }

    function postWithPromise(url, data) {
        return $.post(url, data);
    }

    function post(path, data, success, error) {
        $.ajax({
            url: path,
            type: 'POST',
            data: data,
            success: success,
            error: error
        });
    }

    function put(path, data, success, error) {
        $.ajax(
            {
                url: path,
                type: 'PUT',
                data: data,
                success: success,
                error: error
            });
    }

    function putWithPromise(path, data) {
        return $.ajax({
            url: path,
            type: 'PUT',
            data: data,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });
    }

    function remove(path) {
        return $.ajax({
            url: path,
            type: 'DELETE'
        });
    }

    return {
        getJsonWithPromise: getJsonWithPromise,
        get: get,
        postWithPromise: postWithPromise,
        post: post,
        putWithPromise: putWithPromise,
        put: put,
        remove: remove
    };
})(jQuery);

