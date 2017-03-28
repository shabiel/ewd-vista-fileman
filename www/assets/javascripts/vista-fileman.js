var fileman = {};

// Load CSS & set up nav
fileman.prep = function(EWD) {
  $('body').on('click', '#app-fileman', function() {
    vista.switchApp();
    
    fileman.prepWidgets(EWD);
    
    // Set up app menu items
    $('body').on('click', '#option-fileman-list', function() {
      // Clear the page
      $('#main-content').html('');
      
      let params = {
        service: 'ewd-vista-fileman',
        name: 'list.html',
        targetId: 'main-content',
      };
      EWD.getFragment(params, function() {
        fileman.selectFile(EWD);
        fileman.selectField(EWD);
        fileman.prepClearButton();
        fileman.prepSubmitButton(EWD);
      });
    });
    $('body').on('click', '#option-fileman-find', function() {
      // Clear the page
      $('#main-content').html('');
      
      let params = {
        service: 'ewd-vista-fileman',
        name: 'find.html',
        targetId: 'main-content',
      };
      EWD.getFragment(params, function() {
        fileman.initAutocompletes(EWD);
      });
    });
    $('body').on('click', '#option-fileman-validate', function() {
      // Clear the page
      $('#main-content').html('');
      
      let params = {
        service: 'ewd-vista-fileman',
        name: 'validate.html',
        targetId: 'main-content',
      };
      EWD.getFragment(params, function() {
        // 
      });
    });
    
    // Add to app feature/option menu.
    $('#app-menu #app-name').text('Fileman');
    $('#app-menu .dropdown-menu').append('<li><a href="#" id="option-fileman-list">List Records</a></li>');
    $('#app-menu .dropdown-menu').append('<li><a href="#" id="option-fileman-find">Find Record</a></li>');
    $('#app-menu .dropdown-menu').append('<li><a href="#" id="option-fileman-validate">Validate Field</a></li>');
    $('#app-menu').removeClass('invisible');
    
    $('#option-fileman-list').click();
  });
};

fileman.prepWidgets = function(EWD) {
  // TODO Remove this. Apply namespaced extension to all instances.
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
      classes: {
        'ui-autocomplete': 'fileman-autocomplete-menu'
      },
      // Events
      focus: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fields');

        // Show display field
        $(this).val(ui.item[fields[1].key]);

        return false;
      },
      select: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fields');

        // Attach record data to the element & show display field
        $(this).data('record', ui.item);
        $(this).val(ui.item[fields[1].key]);

        return false;
      }
    }
  });
  
  /*
  Extend the 
  jQuery Autocomplete Widget ~ https://api.jqueryui.com/autocomplete/
  */
  $.widget('vista.filemanAutocomplete', $.ui.autocomplete, {
    _create: function() {
      // Save the data from our custom data attribute
      let input      = this.element;
      let query      = JSON.parse(input.attr('data-fileman'));
      query.quantity = query.quantity || '8';
      /*
      Clean up HTML so jQuery doesn't keep causing colisions as we manipulate
      the HTML5 dataset.
      */
      input.removeAttr('data-fileman');
      input.data('fileman', query);
      // Now fetch, parse, & save complete Fileman query data
      let messageObj = {
        type: 'listDic',
        params: {query}
      };
      EWD.send(messageObj, function(responseObj) {
        let results = responseObj.message.results;
        
        if (results.error) {
          toastr['error'](results.error.msg, ('Fileman error code: ' + results.error.code));
        }
        
        input.data('fileman').file   = results.file;
        input.data('fileman').fields = results.fields;
      });
      // Save placeholder menu data
      let menuData = {
        height: 0,
        prevLastItemIndex: 0,
        prevLastItemPosY: 0
      };
      input.data('menu', menuData);
      
      input.focus(function() {
        /*
        Pre-populate menu. The widget focus event pertains to the items in the
        menu/list, not the input itself. This also depends on minLength=0.
        */
        if (!input.val()) {
          input.filemanAutocomplete('search');
        };
        // Scroll down to input that has focus.
        $('html, body').animate(
          {scrollTop: input.parents('.form-group').offset().top},
          '250',
          'swing'
        );
      });
      
      this._super();
    },
    _renderItem: function(ul, item) {
      // Grab fields data from autocomplete element
      let fields = this.element.data('fileman').fields;
            
      let html   = '';
      html       = html + '<li>';
      html       = html + '<span>' + item[fields[1].key] + '</span>';
      for (let i = 2; i < fields.length; i++) {
        // Skip fields with neither name nor value
        if (fields[i].name || item[fields[i].key]) {
          html   = html + '<br>';
          html   = html + '<span class="indent">';
          // No labels for writeable identifier fields
          if (fields[i].name) {
            html = html + fields[i].name + ': ';
          }
          html   = html + item[fields[i].key];
          html   = html + '</span>';
        }
      }
      html       = html + '</li>';

      return $(html).appendTo(ul);
    },
    _resizeMenu: function() {
      let input      = this.element;
      let menu       = this.menu.element;
      let menuHeight = input.data('menu').height;
      
      if (menuHeight) {
        menu.height(menuHeight);
      }
      else {
        menuHeight                = menu.height();
        input.data('menu').height = menuHeight;
        menu.height(menuHeight);
      }
      
      this._super();
    },
    options: {
      minLength: 0,
      delay: 200,
      classes: {
        'ui-autocomplete': 'fileman-autocomplete-menu'
      },
      // Events
      focus: function(event, ui) {
        // Set up menu for expansion
        let input = $(this);
        let menu = input.data('vistaFilemanAutocomplete').menu.element;
        /*
        This requries the API for the
        jQuery Menu Widget ~ https://api.jqueryui.com/menu/
        */
        menu.one( "menufocus", function( event, ui ) {
          if (menu.menu('isLastItem')) {
            /*
            Don't attempt to expand the menu if the last search returned all
            matches.
            */
            let menuQuantity  = menu[0].childElementCount;
            let queryQuantity = input.data('fileman').quantity;
            
            if (menuQuantity >= queryQuantity) {
              /*
              Save the index and y-position of the last item so it can be
              highlighted and visible when the menu reopens.
              */
              menu.scrollTop(0);
              input.data('menu').prevLastItemIndex = ui.item.index();
              input.data('menu').prevLastItemPosY  = ui.item.position().top;
              // Expand menu
              input.data('fileman').quantity = input.data('fileman').quantity * 2;
              input.filemanAutocomplete('search');
            }
          }
        });
        
        return false;
      },
      open: function(event, ui) {
        let input    = $(this);
        let menu     = $(this).data('vistaFilemanAutocomplete').menu.element;
        let menuData = $(this).data('menu');
        /*
        If menu has been expanded, set previous active item as active and
        scroll down to it.
        */
        if (menuData.prevLastItemIndex) {
          $(menu).menu( "focus", null, menu.find('li:eq(' + menuData.prevLastItemIndex + ')'));
          $(menu).animate(
            {scrollTop: menuData.prevLastItemPosY},
            '250',
            'swing',
            function() {
              // Reset menu item data
              input.data('menu').prevLastItemIndex = 0;
              input.data('menu').prevLastItemPosY  = 0;
            }
          );
        }
      },
      select: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fileman').fields;
        // Attach record data to the element & show display field
        $(this).data('fileman').record = ui.item;
        $(this).val(ui.item[fields[1].key]);

        return false;
      },
      source: function(request, response) {
        let input = this.element;
        
        // Get query properties from element's dataset
        let query        = Object.assign({}, $(input).data('fileman'));
        if (query.fields && Array.isArray(query.fields) && query.fields.length) {
          /*
          We need to know about the IEN "field" so we can parse results from the
          server, but we don't want to include IEN in the fields we request.
          */
          query.fields   = query.fields.slice(1);
          query.fields.forEach(function(field) {
            /*
            The absence of a field number now might indicate a writeable
            identifier. In any event, passing an empty field number will create
            problems. So we assume the intended query did not specify fields.
            */
            if (field.number == '') {
              query.fields = '';
              return;
            }
          });
        }
        query.stringFrom = request.term.toUpperCase();
        query.stringPart = request.term.toUpperCase();
        
        let messageObj = {
          type: 'listDic',
          params: {query}
        };
        EWD.send(messageObj, function(responseObj) {
          let results = responseObj.message.results;
          
          if (results.error) {
            toastr['error'](results.error.msg, ('Fileman error code: ' + results.error.code));
          }

          response(results.records);
        });
      }
    }
  }); // End ~ $.widget('vista.filemanAutocomplete', $.ui.autocomplete, {
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

fileman.initAutocompletes = function(EWD) {
  // Initialize the file input widgets
  $('.fileman-autocomplete').filemanAutocomplete();
  // Set up clear buttons
  $('.fileman-clear').click(function(e) {
    let input = $(this).parents('.form-group').find('.fileman-autocomplete');
    delete input.data('fileman').record;
    input.val('');
    
    $(this).parents('.form-group').find('.fileman-show').attr('disabled', 'disabled');
  });
  // Set up show buttons
  $('.fileman-show').click(function(e) {
    let data = $(this).parents('.form-group').find('.fileman-autocomplete').data('fileman').record;
    
    console.log('Record:');
    console.log(data);
  });
  // Enable show buttons
  $('.fileman-autocomplete').on('filemanautocompleteselect', function(event, ui) {
    $(this).parents('.form-group').find('.fileman-show').removeAttr('disabled');
  });
  // Handle blur events
  $('.fileman-autocomplete').on('filemanautocompletechange', function(event, ui) {
    let input = $(this);
    
    // Only take action if a record has been selected
    if (input.data('fileman').record) {
      // Treat deletion like clicking the clear button.
      if (input.val() == '') {
        input.parents('.form-group').find('.fileman-clear').click();
      }
      // Treat other changes like accidents and restore the input value
      else {
        let displayFieldKey = input.data('fileman').fields[1].key;
        let recordValue     = input.data('fileman').record[displayFieldKey];
        
        if (input.val() != recordValue) {
          input.val(recordValue);
        }
      }
    }
  });
  // Set up add buttons
  $('.fileman-add').click(function(e) {
    let input = $(this).parents('.form-group').find('.fileman-autocomplete');
    let file  = input.data('fileman').file.number;
    
    fileman.laygo(file, EWD);
  });
};

fileman.laygo = function(fileNumber, EWD) {
  let messageObj = {
    service: 'ewd-vista-fileman',
    type: 'laygo',
    params: {file: fileNumber}
  };
  EWD.send(messageObj, function(responseObj) {
    toastr['info'](responseObj.message.permission.toString(), 'Permission:');
  });
}

// module.exports = fileman;
