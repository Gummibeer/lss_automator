function waitForElement(selector, $context, maxRuns) {
    $context = typeof $context === 'undefined' ? $(document) : $context;
    maxRuns = typeof maxRuns === 'undefined' ? 10 : maxRuns;

    return new Promise(function (resolve, reject) {
        let runs = 0;

        let interval = setInterval(function () {
            runs++;
            if (runs > maxRuns) {
                clearInterval(interval);
                reject(new Error('element "'+selector+'" not found after ' + maxRuns + ' runs'));
                return;
            }

            let $el = $(selector, $context);
            if ($el.length === 0) {
                return;
            }

            clearInterval(interval);

            resolve($el);
        }, 500);
    });
}
