var fileman = {};

// Load CSS & set up nav
fileman.prep = function(EWD) {
  $('body').on('click', '#app-fileman', function() {
    fileman.prepWidgets();
    
    // fileman.selectField(EWD);
    
    // Clear the page
    $('#main-content').html('');
    
    let params = {
      service: 'ewd-vista-fileman',
      name: 'list-dic.html',
      targetId: 'main-content',
    };
    EWD.getFragment(params, function() {
      fileman.selectFile(EWD);
    });
  });
};

fileman.prepWidgets = function() {
  // jQuery Autocomplete Widget ~ https://api.jqueryui.com/autocomplete/
  // Extend the widget by redefining it
  // Perhaps I should define a new widget, but for now...
  $.widget( "ui.autocomplete", $.ui.autocomplete, {
    _renderItem: function(ul, item) {
      // Grab fields data from autocomplete element
      let fields = this.element.data('fields');
      
      let html = '';
      html = html + '<li>';
      html = html + '<span>' + item[fields[1].key] + '</span>';
      for (let i = 2; i < fields.length; i++) {
        html = html + '<br>';
        html = html + '<span class="indent">';
        html = html + fields[i].name + ': ';
        html = html + item[fields[i].key];
        html = html + '</span>';
      }
      html = html + '</li>';
      
      return $(html).appendTo(ul);
    },
    options: {
      focus: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fields');
        
        // Show display field
        $(event.target).val(ui.item[fields[1].key]);
        
        return false;
      },
      select: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fields');
        
        // Attach record data to the element & show display field
        $(event.target).data('record', ui.item);
        $(event.target).val(ui.item[fields[1].key]);
        
        return false;
      }
    }
  });
}

fileman.selectFile = function(EWD) {
  // Set up this button
  // $('#vista-user-btn').on('click', function(e) {
  //   let user = $('#vista-user').data().record;
  //
  //   if (user) {
  //     toastr['info']('Check the console for user data');
  //
  //     console.log('User data:');
  //     console.log(user);
  //   }
  //   else {
  //     toastr['warning']('You must select a user');
  //   }
  // });
  
  $('#query-file-btn').on('click', function(e) {
    let record = $('#query-file').data().record;
    let query = {
      file: {
        name: record.name,
        number: record.ien
      },
      fields: [],
    }
    
    $('#query-params').data(query);
  });
  
  // Set up the file input widget
  $( "#query-file" ).autocomplete({
    minLength: 0,
    delay: 200,
    source: function(request, response) {
      // element will be a jQuery UI object
      let element = this.element;
      
      let messageObj = {
        service: 'ewd-vista-fileman',
        type: 'listDic',
        params: {
          query: {
            file: {number: '1'},
            fields: ['.01'],
            string: request.term,
            quantity: 8
          }
        }
      };
      EWD.send(messageObj, function(responseObj) {
        let results = responseObj.message.results;
                
        // Attach file & fields data to the element so the menu can use it
        if (!element.data('fields')) {
          element.data('file', results.file);
          element.data('fields', results.fields);
        }
        
        response(results.records);
      });
    }
  });
};

// fileman.selectField = function(EWD) {
//   // Set up the field input widget
//   $('#query-field').autocomplete({
//     minLength: 0,
//     delay: 200,
//     source: function(request, response) {
//       let file   = $('#query-file').data().file.number;
//       let fields = $('#query-params').data().fields.map(x => {return x.number;});
//
//       // element will be a jQuery UI object
//       let element = this.element;
//
//       let messageObj = {
//         service: 'ewd-vista-fileman',
//         type: 'getFields',
//         params: {
//           query: {
//             file: {
//               number: '200',
//               name: 'NEW PERSON'
//             }
//           }
//         }
//       };
//       EWD.send(messageObj, function(responseObj) {
//         let results = responseObj.message.results;
//
//         // Attach file & fields data to the element so the menu can use it
//         if (!element.data('fields')) {
//           element.data('file', results.file);
//           element.data('fields', results.fields);
//         }
//
//         response(results.records);
//       });
//     }
//   });
//
//
//
//
//   EWD.send(messageObj, function(responseObj) {
//     let results = responseObj.message.results;
//
//     console.log(results);
//   });
// };

// module.exports = fileman;
