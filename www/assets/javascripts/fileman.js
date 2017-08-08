// Fileman module
var fileman = {};

// Load CSS & set up nav
fileman.prep = function(EWD) {
  fileman.defineWidgets(EWD);

  // Set up app menu items
  //
  // List records
  $('body').one('click', '#option-fileman-list', function() {
    // Clear the page
    $('#main-content').html('');

    let params = {
      service: 'ewd-vista-fileman',
      name: 'list.html',
      targetId: 'main-content',
    };
    EWD.getFragment(params, function() {
      fileman.prepAutocompletes(EWD);
      fileman.prepListRecords(EWD);
    });
  });

  // Find a record
  $('body').one('click', '#option-fileman-find', function() {
    // Clear the page
    $('#main-content').html('');

    let params = {
      service: 'ewd-vista-fileman',
      name: 'find.html',
      targetId: 'main-content',
    };
    EWD.getFragment(params, function() {
      fileman.prepAutocompletes(EWD);
    });
  });

  // Build app feature/option menu.
  $('#options-menu #app-name').text('Fileman');
  $('#options-menu .dropdown-menu').append('<li><a href="#" id="option-fileman-list">List Records</a></li>');
  $('#options-menu .dropdown-menu').append('<li><a href="#" id="option-fileman-find">Find Record</a></li>');
  $('#options-menu').removeClass('invisible');

  // TODO Remove in production
  // Auto-select the Find Records feature
  $('#option-fileman-list').click();
};

fileman.defineWidgets = function(EWD) {
  /*
  Autocomplete find one record
  Extend the
  jQuery Autocomplete Widget ~ https://api.jqueryui.com/autocomplete/
  */
  $.widget('vista.filemanAutocomplete', $.ui.autocomplete, {
    _create: function() {
      // Save the data from our custom data attribute
      let input      = this.element;
      let query      = JSON.parse(input.attr('data-fileman-config'));

      // On the HTML5 Input we want the file number
      input[0].dataset.file = query.file.number;

      query.quantity = query.quantity || '8';

      input.data('fileman', query);
      // Now fetch, parse, & save complete Fileman query data
      let messageObj = {
        service: 'ewd-vista-fileman',
        type: 'filemanDic',
        params: {query}
      };
      (function (input, messageObj) {
        EWD.send(messageObj, function(responseObj) {
          let results = responseObj.message.results;

          if (results.error) {
            toastr['error'](results.error.message, ('Fileman error code: ' + results.error.code));
          }
          input.data('fileman').file   = results.file.number;
          input[0].placeholder = results.file.name;
          input.data('fileman').fields = results.fields;


        });
      })(input, messageObj);
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
        }
        // Scroll down to input that has focus.
        $('html, body').animate(
          {scrollTop: input.closest('div').offset().top},
          '250',
          'swing'
        );
      });

      this._super();
    }, // End ~ _create()
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
    }, // End ~ _renderItem()
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
    }, // End ~ _resizeMenu()
    _destroy: function() {
      let input = this.element;
      input.val('');
      input.removeData('filemanConfig');
      input.removeData('fileman');
      input.removeData('menu');

      this._super();
    }, // End ~ _destroy()
    options: {
      minLength: 0,
      delay: 200,
      classes: {
        'ui-autocomplete': 'fm-autocomplete-menu'
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
          service: 'ewd-vista-fileman',
          type: 'filemanDic',
          params: {query}
        };
        EWD.send(messageObj, function(responseObj) {
          let results = responseObj.message.results;

          if (results.error) {
            toastr['error'](results.error.message, ('Fileman error code: ' + results.error.code));
          }

          response(results.records);
        });
      }, // End ~ source
      // Events
      //
      // Blur, if value has changed
      change: function(event, ui) {
        let input = $(this);

        // Only take action if a record has been selected
        if (input.data('fileman').record) {
          // Delete the saved record if the input is empty
          if (input.val() == '') {
            delete input.data('fileman').record;
            input.val('');
          }
          // Treat other changes like accidents and restore the input value
          else {
            let displayFieldKey   = input.data('fileman').fields[1].key;
            let displayFieldValue = input.data('fileman').record[displayFieldKey];

            if (input.val() != displayFieldValue) {
              input.val(displayFieldValue);
            }
          }
        }
      }, // End ~ change
      // Focus shifts to a menu item
      focus: function(event, ui) {
        // Set up menu for expansion
        let input = $(this);
        let menu = input.data('vistaFilemanAutocomplete').menu.element;
        /*
        This requries the API for the
        jQuery Menu Widget ~ https://api.jqueryui.com/menu/
        */
        menu.one( 'menufocus', function( event, ui ) {
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
      }, // End ~ focus
      open: function(event, ui) {
        let input    = $(this);
        let menu     = $(this).data('vistaFilemanAutocomplete').menu.element;
        let menuData = $(this).data('menu');
        /*
        If menu has been expanded, set previous active item as active and
        scroll down to it.
        */
        if (menuData.prevLastItemIndex) {
          $(menu).menu( 'focus', null, menu.find('li:eq(' + menuData.prevLastItemIndex + ')'));
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
      }, // End ~ open
      select: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fileman').fields;
        // Attach record data to the element & show display field
        $(this).data('fileman').record = ui.item;
        $(this).val(ui.item[fields[1].key]);

        // HTML5 Dataset
        $(this)[0].dataset.ien = ui.item.ien;
        $(this)[0].dataset.name = ui.item[fields[1].key];


        // Tell VistA we selected this entry
        let messageObj = {
          service: 'ewd-vista-fileman',
          type: 'dicSelect',
          params: { ien: ui.item.ien, file: $(this).data('fileman').file.number
          }
        };
        EWD.send(messageObj, function(responseObj) {
          let results = responseObj.message;

          if (results.error) {
            toastr['error'](results.error.message, ('Fileman error code: ' + results.error.code));
            delete input.data('fileman').record;
            delete $(this)[0].dataset.ien;
            delete $(this)[0].dataset.name;
            input.val('');
          }
        });

        return false;
      } // End ~ events
    } // End ~ options
  }); // End ~ $.widget('vista.filemanAutocomplete', $.ui.autocomplete, {})

  /*
  Autocomplete find one field
  Extend the
  jQuery Autocomplete Widget ~ https://api.jqueryui.com/autocomplete/
  */
  $.widget('vista.filemanFieldAutocomplete', $.ui.autocomplete, {
    _create: function() {
      let input = this.element;

      input.attr('placeholder', 'FIELD');

      // Save the data from our custom data attribute, if it exists.
      // Otherwise assume the data is dynamically saved.
      let query = input.attr('data-fileman-config');
      if (query) {
        query = JSON.parse(query);
        input.data('fileman', query);
      }
      else {
        query = input.data('fileman');
      }

      // Now fetch, parse, & save complete Fileman query data
      let messageObj = {
        service: 'ewd-vista-fileman',
        type: 'getFields',
        params: {query}
      };
      EWD.send(messageObj, function(responseObj) {
        let results = responseObj.message.results;

        if (results.error) {
          toastr['error'](results.error.message, ('Fileman error code: ' + results.error.code));
        }

        input.data('fileman').file   = results.file;
        input.data('fileman').fields = results.fields;
      });

      input.focus(function() {
        /*
        Pre-populate menu. The widget focus event pertains to the items in the
        menu/list, not the input itself. This also depends on minLength=0.
        */
        if (!input.val()) {
          input.filemanFieldAutocomplete('search');
        }
        // Scroll down to input that has focus.
        $('html, body').animate(
          {scrollTop: input.closest('div').offset().top},
          '250',
          'swing'
        );
      });

      this._super();
    }, // End ~ _create()
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
    }, // End ~ _renderItem()
    _destroy: function() {
      let input = this.element;
      input.val('');
      input.removeData('fileman');

      this._super();
    }, // End ~ _destroy()
    options: {
      minLength: 0,
      delay: 200,
      classes: {
        'ui-autocomplete': 'fm-autocomplete-menu'
      },
      source: function(request, response) {
        // input will be a jQuery UI object
        let input = this.element;

        let messageObj = {
          service: 'ewd-vista-fileman',
          type: 'getFields',
          params: {
            query: {
              file: {
                name: input.data('fileman').file.name,
                number: input.data('fileman').file.number
              }
            }
          }
        };
        EWD.send(messageObj, function(responseObj) {
          let results = responseObj.message.results;
          let records = [];

          if (results.error) {
            toastr['error'](results.error.message, results.error.code);
          }

          // We've overriden auto-matching, so only return matching records
          // First include records matching at beginning of name
          results.records.forEach(function(record) {
            let regex = new RegExp('^' + request.term, 'i');
            if (record.name.match(regex)) {
              records.push(record);
            }
          });
          // Add records that match anywhere in the name
          results.records.forEach(function(record) {
            if (record.name.match(request.term.toUpperCase()) && !records.includes(record)) {
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
      }, // End ~ source
      // Events
      //
      // Blur, if value has changed
      change: function(event, ui) {
        let input = $(this);

        // Only take action if a record has been selected
        if (input.data('fileman').record) {
          // Delete the saved record if the input is empty
          if (input.val() == '') {
            delete input.data('fileman').record;
            input.val('');
          }
          // Treat other changes like accidents and restore the input value
          else {
            let displayFieldKey   = input.data('fileman').fields[1].key;
            let displayFieldValue = input.data('fileman').record[displayFieldKey];

            if (input.val() != displayFieldValue) {
              input.val(displayFieldValue);
            }
          }
        }
      }, // End ~ change
      select: function(event, ui) {
        // Grab fields data from autocomplete element
        let fields = $(this).data('fileman').fields;
        // Attach record data to the element & show display field
        $(this).data('fileman').record = ui.item;
        $(this).val(ui.item[fields[1].key]);

        // HTML5 Dataset
        $(this)[0].dataset.ien = ui.item.ien;
        $(this)[0].dataset.name = ui.item[fields[1].key];
        return false;
      } // End ~ events
    } // End ~ options
  }); // End ~ $.widget('vista.filemanFieldAutocomplete', $.ui.autocomplete, {})
};

fileman.prepAutocompletes = function(EWD) {
  // Initialize the file input widgets
  $('.fm-autocomplete').filemanAutocomplete();

  // Set up show buttons
  $('.fm-btn-show').click(function() {
    let data = $(this).parents('form').find('.fm-autocomplete').data('fileman').record;

    console.log('Record:');
    console.log(data);

    return false;
  });
  // Enable show buttons
  $('.fm-autocomplete').on('autocompleteselect', function(event, ui) {
    $(this).parents('form').find('.fm-btn-show').removeAttr('disabled');
  });
  // Disable show buttons
  $('.fm-autocomplete').on('autocompletechange', function(event, ui) {
    if (!$(this).val()) {
      $(this).parents('form').find('.fm-btn-show').attr('disabled', 'disabled');
    }
  });

  // Set up add buttons
  $('.fm-btn-add').click(function() {
    let input = $(this).parents('form').find('.fm-autocomplete');
    let file  = input.data('fileman').file.number;

    let messageObj = {
      service: 'ewd-vista-fileman',
      type: 'checkLaygo',
      params: {
        query: {
          file: file
        }
      }
    };
    EWD.send(messageObj, function(responseObj) {
      let permission = responseObj.message.results.laygo;

      if (permission) {
        let params = {
          service: 'ewd-vista-fileman',
          name: 'add.html',
          targetId: 'modal-window'
        };
        EWD.getFragment(params, function() {
          $('#modal-window').modal('show');

          fileman.prepValidation(EWD);
        });
      }
      else {
        toastr['warning']('You don\'t have LAYGO permissions for this file!');
      }
    });

    return false;
  });
}; // End ~ fileman.prepAutocompletes

fileman.prepListRecords = function(EWD) {
  // Set up file select button
  $('#query-file-btn').click(function() {
    $(this).attr('disabled', 'disabled');
    $('#query-file').attr('disabled', 'disabled');
    $('#query-field').removeAttr('disabled');

    let queryData   = $('#query-file').data('fileman').record;
    let queryParams = {
      file: {
        name: queryData.name,
        number: queryData.ien
      }
    };
    $('#query-field').data('fileman', Object.assign({}, queryParams));
    $('#query-params').data('fileman', Object.assign({}, queryParams));
    $('#query-params').data('fileman').fields = [];

    // Initialize the field input widgets
    $('.fm-fld-autocomplete').filemanFieldAutocomplete();

    return false;
  });
  // Enable file select button
  $('#query-file').on('autocompleteselect', function(event, ui) {
    $('#query-file-btn').removeAttr('disabled');
  });

  // Set up field select button
  $('#query-field-btn').click(function() {
    $(this).attr('disabled', 'disabled');

    // Add field to query array
    let field = $('#query-field').data('fileman').record;
    $('#query-params').data('fileman').fields.push(Object.assign({}, field));

    // Add field to displayed fields
    let fieldsList = $('#query-params').val();
    if (!fieldsList) {
      $('#query-params').val(field.name);
    }
    else {
      fieldsList = fieldsList + ', ' + field.name;
      $('#query-params').val(fieldsList);
    }

    // Clear field input
    $('#query-field').val('');
    delete $('#query-field').data('fileman').record;

    $('#query-submit-btn').removeAttr('disabled');

    return false;
  });
  // Enable field select button
  $('#query-field').on('autocompleteselect', function(event, ui) {
    $('#query-field-btn').removeAttr('disabled');
  });

  // Set up query submit button
  $('#query-submit-btn').on('click', function() {
    let queryData = $('#query-params').data('fileman');

    let messageObj = {
      service: 'ewd-vista-fileman',
      type: 'filemanDic',
      params: {
        query: {
          file: {number: queryData.file.number},
          fields: queryData.fields,
          stringFrom: '',
          stringPart: ''
        }
      }
    };
    EWD.send(messageObj, function(responseObj) {
      let results = responseObj.message.results;

      if (results.error) {
        toastr['error'](results.error.message, results.error.code);
      }

      fileman.showListRecords(results, EWD);
    });
  });

  // Set up clear button
  $('#query-clear-btn').on('click', function() {
    // Disable inputs & buttons
    $('#query-file').attr('disabled', 'disabled');
    $('#query-file-btn').attr('disabled', 'disabled');
    $('#query-field').attr('disabled', 'disabled');
    $('#query-field-btn').attr('disabled', 'disabled');
    $('#query-submit-btn').attr('disabled', 'disabled');

    // Reset query
    $('#query-params').val('');
    $('#query-params').removeData('fileman');

    // Remove any displayed records
    $('#fileman-results').remove();

    // Reset input widgets
    $('#query-file').filemanAutocomplete('destroy').filemanAutocomplete().removeAttr('disabled');
    if ($('#query-field').filemanFieldAutocomplete('instance')) {
      $('#query-field').filemanFieldAutocomplete('destroy');
    }

    return false;
  });
};

fileman.showListRecords = function(results, EWD) {
  let html = '';
  html = html + '<div id="fileman-results">';
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

fileman.prepValidation = function(EWD) {
  let input = $('.fileman-laygo');

  let query = Object.assign({}, input.data('fileman'));
  query.quantity = '1';

  input.data('fileman', query);
  // Now fetch, parse, & save complete Fileman query data
  let messageObj = {
    service: 'ewd-vista-fileman',
    type: 'filemanDic',
    params: {query: query}
  };
  EWD.send(messageObj, function(responseObj) {
    let results = responseObj.message.results;

    if (results.error) {
      toastr['error'](results.error.message, ('Fileman error code: ' + results.error.code));
    }

    input.data('fileman').file   = results.file;
    input.data('fileman').fields = results.fields;

    // Now set up validation
    $('.fm-btn-validate').click(function(e) {
      let formGroup    = input.parents('.form-group');
      let errorElement = formGroup.find('.form-control-feedback');

      let query   = Object.assign({}, input.data('fileman'));
      query.iens  = '+1,';
      query.value = input.val();

      messageObj = {
        service: 'ewd-vista-fileman',
        type: 'validateField',
        params: {query: query}
      };
      EWD.send(messageObj, function(responseObj) {
        let results = responseObj.message.results;

        if (results.valid) {
          errorElement.html('');
          formGroup.removeClass('has-error');

          toastr['success']('Valid entry!');
        }
        if (!results.valid) {
          let message = results.error.help || results.error.message;

          errorElement.html(message);
          formGroup.addClass('has-error');
          // Boostrap 4
          // formGroup.addClass('has-danger');
        }
      });

      return false;
    }); // End ~ $('.fm-btn-validate').click()
  });
};

// module.exports = fileman;
