var fileman = {};

// Load CSS & set up nav
fileman.prep = function(EWD) {
  $('body').on('click', '#app-fileman', function() {
    // Clear the page
    $('#main-content').html('');
    
    $('#main-content').append('');
    
    fileman.doSomething(EWD);
  });
};

// module.exports = fileman;
