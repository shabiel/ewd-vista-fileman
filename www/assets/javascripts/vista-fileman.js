var fileman = {};

// Load CSS & set up nav
fileman.prep = function(EWD) {
  $('body').on('click', '#app-fileman', function() {
    vista.switchApp();
    
    fileman.prepWidgets(EWD);
    
    // Set up app menu items
    $('body').on('click', '#option-fileman-dev', function() {
      // Clear the page
      $('#main-content').html('');
      
      let params = {
        service: 'ewd-vista-fileman',
        name: 'dev.html',
        targetId: 'main-content',
      };
      EWD.getFragment(params, function() {
        fileman.dev(EWD);
      });
    });
    $('body').on('click', '#option-fileman-list-dic', function() {
      // Clear the page
      $('#main-content').html('');
      
      let params = {
        service: 'ewd-vista-fileman',
        name: 'list-dic.html',
        targetId: 'main-content',
      };
      EWD.getFragment(params, function() {
        fileman.selectFile(EWD);
        fileman.selectField(EWD);
        fileman.prepClearButton();
        fileman.prepSubmitButton(EWD);
      });
    });
    
    // Add to app feature/option menu.
    $('#app-menu #app-name').text('Fileman');
    $('#app-menu .dropdown-menu').append('<li><a href="#" id="option-fileman-dev">Dev</a></li>');
    $('#app-menu .dropdown-menu').append('<li><a href="#" id="option-fileman-list-dic">LIST^DIC</a></li>');
    $('#app-menu').removeClass('invisible');
    
    $('#option-fileman-dev').click();
  });
};

fileman.prepWidgets = function(EWD) {
  // jQuery Autocomplete Widget ~ https://api.jqueryui.com/autocomplete/
  // Extend the widget by redefining it
  $.widget('ui.autocomplete', $.ui.autocomplete, {
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
  
  // jQuery Autocomplete Widget ~ https://api.jqueryui.com/autocomplete/
  // Extend the widget
  $.widget('vista.filemanListDic', $.ui.autocomplete, {
    _renderItem: function(ul, item) {
      // Grab fields data from autocomplete element
      let fields = this.element.data('fileman').fields;
      
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
      minLength: 0,
      delay: 200,
      focus: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fileman').fields;

        // Show display field
        $(event.target).val(ui.item[fields[1].key]);

        return false;
      },
      select: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fileman').fields;

        // Attach record data to the element & show display field
        $(event.target).data('fileman').record = ui.item;
        $(event.target).val(ui.item[fields[1].key]);

        return false;
      },
      source: function(request, response) {
        // input will be a jQuery UI object
        let input = this.element;
        
        let query        = Object.assign({}, $(input).data('fileman'));
        query.fields     = [];
        query.stringFrom = request.term;
        query.stringPart = request.term;
        query.quantity   = '8'
        let messageObj = {
          type: 'listDic',
          params: {query}
        };
        EWD.send(messageObj, function(responseObj) {
          let results = responseObj.message.results;
          
          if (results.error) {
            toastr['error'](results.error.msg, results.error.code);
          }

          // Attach file & fields data to the HTML element so the menu can use it
          if (!input.data('fileman').fields) {
            input.data('fileman').file   = results.file;
            input.data('fileman').fields = results.fields;
          }

          response(results.records);
        });
      }
    }
  }); // End ~ $.widget('vista.autocomplete', $.ui.autocomplete, {
};

fileman.selectFile = function(EWD) {
  // Set up file input button
  $('#query-file-btn').on('click', function(e) {
    let file = $('#query-file').data('record');

    if (file) {
      let query = {
        file: {
          name: file.name,
          number: file.ien
        },
        fields: [],
      };
    
      $('#query-params').data(query);
      
      $('#query-field').removeAttr('disabled');
      $('#query-field-btn').removeAttr('disabled');
      
      $('#query-file').attr('disabled', 'disabled');
      $('#query-file-btn').attr('disabled', 'disabled');
    }
    else {
      toastr['warning']('You must select a file');
    }
  });
  
  // Set up the file input widget
  $('#query-file').autocomplete({
    minLength: 0,
    delay: 200,
    source: function(request, response) {
      // input will be a jQuery UI object
      let input = this.element;

      let messageObj = {
        type: 'listDic',
        params: {
          query: {
            file: {number: '1'},
            fields: [{number: '.01'}],
            stringFrom: request.term,
            stringPart: request.term,
            quantity: '8'
          }
        }
      };
      EWD.send(messageObj, function(responseObj) {
        let results = responseObj.message.results;

        if (results.error) {
          toastr['error'](results.error.msg, results.error.code);
        }

        //  Create a pseudo-field for this special input to show file number
        results.fields.push(
          {
            key: 'number',
            name: 'Number',
            number: ''
          }
        );
        // Populate records with the pseudo-field
        results.records.forEach(function(record) {
          record.number = record.ien;
        });

        // Attach file & fields data to the HTML element so the menu can use it
        if (!input.data('fields')) {
          input.data('file', results.file);
          input.data('fields', results.fields);
        }

        response(results.records);
      });
    }
  });
};

fileman.selectField = function(EWD) {
  // Set up field input button
  $('#query-field-btn').on('click', function(e) {
    let field = $('#query-field').data('record');

    if (field) {
      // Update query data
      let fields = $('#query-params').data('fields');
      fields.push(field);
      $('#query-params').data('fields', fields);
      
      // Update displayed list of fields
      let fieldsString = $('#query-params').val();
      if (fieldsString) {
        fieldsString   = fieldsString + ', ';
      }
      fieldsString     = fieldsString + field.name;
      $('#query-params').val(fieldsString);
      
      // Clear input
      $('#query-field').removeData('record');
      $('#query-field').val('');
      
      // Enable submit button
      $('#query-submit-btn').removeAttr('disabled');
    }
    else {
      toastr['warning']('You must select a field');
    }
  });
  
  // Set up the file input widget
  $('#query-field').autocomplete({
    minLength: 0,
    delay: 200,
    source: function(request, response) {
      // input will be a jQuery UI object
      let input = this.element;
      
      let messageObj = {
        service: 'ewd-vista-fileman',
        type: 'getFields',
        params: {
          query: {
            file: {
              name: $('#query-params').data('file').name,
              number: $('#query-params').data('file').number
            }
          }
        }
      };
      EWD.send(messageObj, function(responseObj) {
        let results = responseObj.message.results;
        let records = [];
        
        if (results.error) {
          toastr["error"](results.error.msg, results.error.code);
        }
        
        // We've overriden auto-matching, so only return matching records
        // First include records matching at beginning of name
        results.records.forEach(function(record) {
          let regex = new RegExp('^' + request.term);
          if (record.name.match(regex)) {
            records.push(record);
          }
        });
        // Add records that match anywhere in the name
        results.records.forEach(function(record) {
          if (record.name.match(request.term) && !records.includes(record)) {
            records.push(record);
          }
        });
        // Limit results
        records = records.slice(0,8);
        
        // Attach file & fields data to the HTML element so the menu can use it
        if (!input.data('fields')) {
          input.data('file', results.file);
          input.data('fields', results.fields);
        }
        
        response(records);
      });
    }
  });
};

fileman.prepClearButton = function() {
  $('#query-clear-btn').on('click', function() {
    $('#query-submit-btn').attr('disabled', 'disabled');
    
    $('#query-params').removeData(['file', 'fields']);
    $('#query-params').val('');
    
    $('#query-field').attr('disabled', 'disabled');
    $('#query-field').removeData(['file', 'fields', 'record']);
    $('#query-field-btn').val('');
    
    
    $('#query-file').removeData(['record']);
    $('#query-file').val('');
    $('#query-file-btn').removeAttr('disabled');
    $('#query-file').removeAttr('disabled');
    
    $('#fileman-results').remove();
  });
};

fileman.prepSubmitButton = function(EWD) {
  $('#query-submit-btn').on('click', function() {
    let messageObj = {
      type: 'listDic',
      params: {
        query: {
          file: {number: $('#query-params').data('file').number},
          fields: $('#query-params').data('fields'),
          stringFrom: '',
          stringPart: ''
        }
      }
    };
    EWD.send(messageObj, function(responseObj) {
      let results = responseObj.message.results;
      
      if (results.error) {
        toastr["error"](results.error.msg, results.error.code);
      }
      
      fileman.showResults(results, EWD);
    });
  });
};

fileman.showResults = function(results, EWD) {
  let html = '';
  html = html + '<div id="fileman-results" class="main">';
  html = html + '<h3 class="sub-header">Query Results</h3>';
  html = html + '<div class="table-responsive">';
  html = html + '<table class="table table-striped">';
  html = html + '<thead>';
  html = html + '<tr>';
  results.fields.forEach(function(field) {
    html = html + '<tH>' + field.name + '</tH>';
  });
  html = html + '</tr>';
  html = html + '</thead>';
  html = html + '<tbody>';
  results.records.forEach(function(record) {
    html = html + '<tr>';
    results.fields.forEach(function(field) {
      html = html + '<td>' + record[field.key] + '</td>';
    });
    html = html + '</tr>';
  });
  html = html + '</tbody>';
  html = html + '</table>';
  html = html + '</div>';
  html = html + '</div>';
  
  $('#fileman').append(html);
};

fileman.dev = function(EWD) {
  // Set up the file input widget
  $('.fileman-list-dic').filemanListDic();
};

// module.exports = fileman;

