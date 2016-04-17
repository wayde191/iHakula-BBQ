var ewok = ewok || {};

ewok.browser_hacks = ewok.browser_hacks || {};

ewok.browser_hacks.preloadImages = (function(){
    "use strict";

    var greenSpinner= new Image(32,32);
    greenSpinner.src = "../../images/spinner-green.gif";

    var redSpinner = new Image(32,32);
    redSpinner.src = "../../images/spinner-red.gif";

    var greySpinner = new Image(32,32);
    redSpinner.src = "../../images/spinner-grey.gif";

    var images = [greenSpinner, redSpinner, greySpinner];

    return {
        images: images
    };

})();