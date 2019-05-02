(function() {
    console.log('init LSS-Automator');

    const subscription = faye.subscribe('/private-user'+user_id+'de', handleFayeEvent );
    
    function handleFayeEvent(message) {
        console.log(message);
    }
})();
