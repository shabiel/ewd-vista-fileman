/* Set-up module.export.handlers structure */
module.exports          = {};
module.exports.handlers = {};

// LIST^DIC
// FIXME Only include fields that are not subfiles
// FIXME Handle FileMan errors
module.exports.handlers.listDic = function(messageObj, session, send, finished) {
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
  
  let query = messageObj.params.query;
    
  // Add file data to results
  let fileNode = new this.documentStore.DocumentNode('DIC', [query.file.number, '0']);
  let fileName = fileNode.value.split('^')[0];
  
  results.file.number = query.file.number;
  results.file.name   = fileName;
  
  // Add fields data to results
  for (let i = 0; i < query.fields.length; i++) {
    let fieldNode = new this.documentStore.DocumentNode('DD', [query.file, query.fields[i], '0']);
    let fieldName = fieldNode.value.split('^')[0];
    
    let field = {
      number: query.fields[i],
      name: fieldName,
      key: fieldName.toLowerCase().replace(/ /g, '')
    };
    
    results.fields.push(field);
  }
  
  // Submit primary query & add records to results
  let fieldsParam = '@;' + query.fields.join(';');
  let fieldsMap   = 'IEN^' + query.fields.join('^');

  let response = this.db.function({
    function: 'LIST^ewdVistAFileman',
    arguments: [query.file, '', fieldsParam, 'PQ', query.quantity, query.string, query.string, '', '', '']
  });
  
  let recordsNode = new this.documentStore.DocumentNode('TMP', ['DILIST', process.pid]);
  let recordsData = this.handlers['ewd-vista'].convertDilistToArray(recordsNode);
  recordsData     = recordsData[fieldsMap];

  recordsData.forEach(function(recordData) {
    recordData = recordData.split('^');
    
    let record      = {};
    // Use results.fields to dynamically assign pieces of data to properties
    results.fields.forEach(function(field, index) {
      record[field.key] = recordData[index];
    });
    
    results.records.push(record);
  });
  
  finished({results: results});
};

module.exports.handlers.getFields = function(messageObj, session, send, finished) {
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
  let fields     = [];
  
  // Apply structure to fields data
  Object.keys(fieldsData).forEach(function(fieldName) {
    let field  = {};
    field.name = fieldName;

    Object.keys(fieldsData[fieldName]).forEach(function(fieldNumber) {
      // There should only be one property -- field number
      // Non-empty string values indicate previous DD cross-references
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
};