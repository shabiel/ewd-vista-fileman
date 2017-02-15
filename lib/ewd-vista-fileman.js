/* Set-up module.export.handlers structure */
module.exports          = {};
module.exports.handlers = {};

// 
module.exports.handlers.placeholder = function(messageObj, session, send, finished) {
  
  
  finished({placeholder: placeholder});
};
