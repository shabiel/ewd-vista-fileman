let vista = require('ewd-vista');

module.exports          = {};
module.exports.init = function() {
  vista.init.call(this);
};
module.exports.beforeHandler = vista.beforeHandler;

/* Set-up module.export.handlers structure */
module.exports = {
  handlers: {
    // Server methods
    filemanDicSync: function(query) {
      /*
      When called from outside of this module,
      requires this to be the worker process for the calling module handler:
        let result = fileman.filemanDicSync.call(this, filemanMsg);
      */

      // This is for use later when sorting records
      let pointZeroOneField = '';

      // Start building final data structure of results
      // TODO Consider converting to formal JSON
      let results = {
        error: '',
        file: {},
        fields: [
          {
            key: 'ien',
            name: 'IEN',
            number: ''
          }
        ],
        records: []
      };

      // Add file data to results
      let fileNode = new this.documentStore.DocumentNode('DIC', [query.file.number, '0']);
      let fileName = fileNode.value.split('^')[0];

      results.file.number = query.file;
      results.file.name   = fileName;

      // If the query specifies fields, build the fields parameter for LIST^DIC
      let fieldNums   = [];
      let fieldsParam = '';
      if (query.fields && Array.isArray(query.fields) && query.fields.length) {
        fieldNums   = query.fields.map(x => {return x.number;});
        fieldsParam = '@;' + fieldNums.join(';');
      }

      // Submit primary query
      let response = this.db.function({
        function: 'LIST^ewdVistAFileman',
        arguments: [
          query.file.number,
          query.iens || '',
          fieldsParam,
          query.flags || 'PQM',
          query.quantity || '',
          query.stringFrom || '',
          query.stringPart || '',
          query.index || '',
          query.screen || '',
          query.identifier || ''
        ]
      });

      let recordsNode = new this.documentStore.DocumentNode('TMP', ['DILIST', process.pid]);
      let recordsData = convertDilistToArray(recordsNode);
      /*
        {
          'IEN^IX(1)^FID(1)^FID(28)^WID(W8)': [
            '2005.2^NETWORK LOCATION',
            '4.501^NETWORK SENDERS REJECTED',
            '4.5^NETWORK TRANSACTION',
            '200^NEW PERSON',
            '6920.1^NEW WORK ACTION'
          ]
        }
      */
      let fieldsMap = Object.keys(recordsData)[0];

      // Add fields data to results
      // Get field numbers
      if (!fieldNums.length) {
        // Parse fieldsMap & get field numbers from identifiers
        fieldsMap.split('^').slice(1).forEach(function(identifier, index) {
          if (identifier == 'IX(1)' || identifier == '.01I') {
            fieldNums.push('.01');
          }
          else if (identifier.match(/FID\(/)) {
            fieldNums.push(identifier.replace('FID(', '').replace(')', ''));
          }
          else if (identifier.match(/WID\(/)) {
            // These will have a preceding letter, eg, W8
            fieldNums.push(identifier.replace('WID(', '').replace(')', ''));
          }
        });
      }
      // Get field names
      for (let i = 0; i < fieldNums.length; i++) {
        let field = {};

        if (parseFloat(fieldNums[i])) {
          let fieldNode = new this.documentStore.DocumentNode('DD', [query.file.number, fieldNums[i], '0']);
          let fieldName = fieldNode.value.split('^')[0];
          let fieldKey  = fieldName.toLowerCase().replace(/ /g, '');

          field = {
            number: fieldNums[i],
            name: fieldName,
            key: fieldKey
          };

          // Save key of .01 field for sorting records
          if (fieldNums[i] == '.01') {pointZeroOneField = fieldKey;}
        }
        // Cover WID fields, for which we can't use field numbers
        else {
          field = {
            number: '',
            name: '',
            key: fieldNums[i].toLowerCase().replace(/ /g, '')
          };
        }

        results.fields.push(field);
      }

      // Add records data to results
      recordsData   = recordsData[fieldsMap];

      // If ^TMP("DILIST") doesn't contain results, check ^TMP("DIERR")
      if (recordsData.length) {
        recordsData.forEach(function(recordData) {
          recordData = recordData.split('^');

          let record      = {};
          // Use results.fields to dynamically assign pieces of data to properties
          results.fields.forEach(function(field, index) {
            record[field.key] = recordData[index].trim();
          });

          results.records.push(record);
        });

        // Sort results.records in case multiple indices produce matches.
        // Start by finding key of .01 field
        if (pointZeroOneField) {
          results.records.sort((x, y) => {
            if (x[pointZeroOneField] < y[pointZeroOneField]) {return -1;}
            if (x[pointZeroOneField] > y[pointZeroOneField]) {return 1;}
            return 0;
          });
        }
      }
      else {
        results.error = checkDierr.call(this);
      }

      return results;
    }, // End ~ filemanDicSync()
    // Client methods
    filemanDic: function(messageObj, session, send, finished) {
      let query    = messageObj.params.query;
      // Disallow Mumps code from client
      query.screen = '';
      query.identifier = '';

      let results  = this.handlers['ewd-vista-fileman'].filemanDicSync.call(this, query);

      finished({results: results});
    }, // End ~ filemanDic()
    getFields: function(messageObj, session, send, finished) {
      // Start building final data structure of results
      // TODO Consider converting to formal JSON
      let results = {
        error: '',
        file: {},
        fields: [
          {
            key: 'ien',
            name: 'IEN',
            number: ''
          },
          {
            key: 'name',
            name: 'NAME',
            number: ''
          },
          {
            key: 'number',
            name: 'Number',
            number: ''
          }
        ],
        records: []
      };

      let file = messageObj.params.query.file;

      // Add file data to results
      results.file.number = file.number;
      results.file.name   = file.name;

      // Add records (in this case fields) to results
      // TODO Convert the EWD Document Store calls to Mumps
      let fieldsNode = new this.documentStore.DocumentNode('DD', [file.number, 'B']);
      let fieldsData = fieldsNode.getDocument();
      console.log(fieldsData);
      let fields     = [];

      // Apply structure to fields data
      Object.keys(fieldsData).forEach(function(fieldName) {
        let field  = {};
        field.name = fieldName;

        Object.keys(fieldsData[fieldName]).forEach(function(fieldNumber) {
          // There should only be one property -- field number
          // Non-empty string values indicate a title & mnemonic cross-reference
          if (fieldsData[fieldName][fieldNumber] == '') {
            // Convert numbers to Mumps canonical format but save as strings
            field.number = fieldNumber.replace(/^0/, '');
          }
        });

        // Keep only current DD cross-references
        if (field.number) {
          fields.push(field);
        }
      });

      // Discard multiple fields (subfiles and word-processing fields)
      let self = this;

      fields.forEach(function(field) {
        let fieldData = new self.documentStore.DocumentNode('DD', [file.number, field.number, '0']).value;
        let fieldType = parseFloat(fieldData.split('^')[1]);
        let keepField = fieldType ? false : true;

        if (keepField) { results.records.push(field); }
      });

      finished({results: results});
    }, // End ~ getFields()
    checkLaygo: function(messageObj, session, send, finished) {
      let results         = {};
      let file            = messageObj.params.query.file;
      let filePermissions = new this.documentStore.DocumentNode('DIC', [file, '0', 'LAYGO']).value;

      if (filePermissions) {
        let userPermissions = session.data.getDocument().ewd_symbolTable.DUZ['0'].split();

        if (userPermissions.includes('@')) {
          results.laygo = true;

          finished({results: results});
        }
        else {
          filePermissions = filePermissions.split();

          userPermissions.forEach(function(char) {
            if (filePermissions.includes(char)) {
              results.laygo = true;

              finished({results: results});
            }
          });

          results.laygo = false;

          finished({results: results});
        }
      }
      else {
        let fileExists = new this.documentStore.DocumentNode('DIC', [file, '0']).exists;
        results.laygo = fileExists;

        finished({results: results});
      }
    }, // End ~ laygo()
    validateField: function(messageObj, session, send, finished) {
      let query    = messageObj.params.query;
      let results  = {
        error: '',
        valid: false,
        value: query.value
      };
      // Submit primary query
      let response = this.db.function({
        function: 'VALIDATE^ewdVistAFileman',
        arguments: [
          query.file.number,
          query.iens,
          query.fields[1].number,
          'FH',
          query.value,
          session.id
        ]
      });

      let filemanArray = session.data.$('Fileman');
      if (filemanArray.$(['FDA', query.file.number, query.iens, query.fields[1].number]).value) {
        results.valid = true;
      }
      else {
        results.error         = {};
        results.error.code    = filemanArray.$(['DI', 'DIERR', 1]).value;
        results.error.message = '';
        results.error.help    = '';

        let filemanError = filemanArray.$(['DI', 'DIERR', 1, 'TEXT']).getDocument();
        Object.keys(filemanError).forEach(function(key) {
          if (filemanError[key]) {
            results.error.message = results.error.message + filemanError[key];
          }
          else {
            results.error.message = results.error.message + '\u000A';
            // results.error.message = results.error.message + '<br>';
          }
        });

        let filemanHelp = filemanArray.$(['DI', 'DIHELP']).getDocument();
        Object.keys(filemanHelp).forEach(function(key) {
          if (filemanHelp[key]) {
            results.error.help = results.error.help + filemanHelp[key];
          }
          else {
            results.error.help = results.error.help + '\u000A';
            // results.error.help = results.error.help + '<br>';
          }
        });
      }

      finished({results: results});
    }, // End ~ validateField()



    dicSelect: function(messageObj, session, send, finished) {
      let result = {};
      this.db.symbolTable.restore(session);
      let selectionResult = this.db.function({
        function: 'select^ewdVistAFileman',
        arguments: [messageObj.params.file, messageObj.params.ien]
      }).result;
      if (selectionResult.$p(2) === 'OK') result.error = '';
      else  result.error = 'Entry access disallowed';
      finished(result);
    } // ~dicSelect
  } // End ~ module.exports.handlers
};

// Private methods
function convertDilistToArray(node) {
  /*
  Calling code should first do something like:
  let node =
  new this.documentStore.DocumentNode('TMP', ['DILIST', process.pid])

  ^TMP('DILIST',1314,0)='3236^*^0^'
  ^TMP('DILIST',1314,0,'MAP')='IEN^IX(1)'
  ^TMP('DILIST',1314,1,0)='1578^ACKQAUD1'
  ^TMP('DILIST',1314,2,0)='1579^ACKQAUD2'
  */

  let arrayKey     = node.$('0').$('MAP').value;
  let entriesArray = [];

  node.forEachChild(
    {
      range: {
        from: '1',
        to: ''
      }
    },
    function(name, ChildNode) {
      entriesArray.push(ChildNode.$('0').value);
    }
  );

  let results       = {};
  results[arrayKey] = entriesArray;

  return results;
} // End ~ convertDilistToArray()

function checkDierr() {
  let err = '';

  let errNode = new this.documentStore.DocumentNode('TMP', ['DIERR', process.pid, 1]);
  if (errNode.exists) {
    err = {
      code: errNode.value,
      message: errNode.lastChild.firstChild.value
    };
  }

  return err;
} // End ~ checkDierr
