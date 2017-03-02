/* Set-up module.export.handlers structure */
module.exports          = {};
module.exports.handlers = {};

module.exports.handlers.listDic = function(messageObj, session, send, finished) {
  let query   = messageObj.params.query;
  let results = this.handlers['ewd-vista'].listDic.call(this, query);

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