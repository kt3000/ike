var tables = {};
var listeners = [];

var TableManager = {
  hasTablesInLocalStorage: function() {
    return ('tables' in localStorage);
  },
  deserializeTables: function() {
    try {
      var serialized = localStorage.getItem('tables');
      var deserialized = JSON.parse(serialized);
      var t = typeof deserialized;
      if (t == 'object') {
        return deserialized;
      } else {
        console.warn('Expected localStorage.tables to be object, found ' + t);
        return {};
      }
    } catch (err) {
      console.warn('Could not deserialize tables: ' + err.message);
      return {};
    }
  },
  /** Loads the tables from localStorage and adds them to the TableManager
    * data structures.
    */
  loadTablesFromLocalStorage: function() {
    if (this.hasTablesInLocalStorage()) {
      var deserialized = this.deserializeTables();
      var tableNames = Object.keys(deserialized);
      tableNames.map(function(tableName) {
        var table = deserialized[tableName];
        this.createTable(table);
      }.bind(this));
      return deserialized;
    } else {
      return {};
    }
  },
  saveTablesToLocalStorage: function() {
    var serialized = JSON.stringify(tables);
    try {
      localStorage.setItem('tables', serialized);
    } catch (err) {
      alert('Could not save tables: ' + err.message);
    }
  },
  valueString: function(value) {
    var qwords = value.qwords;
    var words = qwords.map(function(qw) { return qw.value; });
    return words.join(" ");
  },
  stringValue: function(string) {
    var words = string.split(" ");
    var qwords = words.map(function(w) { return {value: w}; });
    return {qwords: qwords};
  },
  stringsRow: function(strings) {
    var values = strings.map(this.stringValue);
    return {values: values};
  },
  getTables: function() {
    return tables;
  },
  getRows: function(tableName, rowType) {
    if (this.hasTable(tableName)) {
      return tables[tableName][rowType];
    } else {
      return [];
    }
  },
  addChangeListener: function(listener) {
    listeners.push(listener);
  },
  removeChangeListener: function(listener) {
    var index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(listener, 1);
    }
  },
  updateListeners: function() {
    listeners.map(function(listener) {
      listener(tables);
    });
    this.saveTablesToLocalStorage();
  },
  hasTable: function(tableName) {
    return tableName in tables;
  },
  createTable: function(table) {
    if (!this.hasTable(table.name)) {
      var positive = 'positive' in table ? table.positive : [];
      var negative = 'negative' in table ? table.negative : [];
      tables[table.name] = {
        name: table.name,
        cols: table.cols.slice(0),
        positive: positive,
        negative: negative
      };
      this.updateListeners();
    }
  },
  deleteTable: function(tableName) {
    var posRows = this.getRows(tableName, "positive");
    var negRows = this.getRows(tableName, "negative");
    if (this.hasTable(tableName)) {
      delete tables[tableName];
      this.updateListeners();
    }
  },
  addRow: function(tableName, rowType, row) {
    var hasTable = this.hasTable(tableName);
    var hasRow = this.hasRow(tableName, rowType, row);
    if (hasTable && !hasRow) {
      var rows = tables[tableName][rowType];
      rows.unshift(row);
      this.updateListeners();
    }
  },
  deleteRow: function(tableName, rowType, row) {
    if (this.hasRow(tableName, rowType, row)) {
      var rows = tables[tableName][rowType];
      var index = rows.indexOf(row);
      rows.splice(index, 1);
      this.updateListeners();
    }
  },
  hasRow: function(tableName, rowType, row) {
    var table = tables[tableName];
    if(!table)
      return false;

    var rows;
    if(rowType === "positive")
      rows = table.positive;
    else if(rowType === "negative")
      rows = table.negative;
    else
      return false;

    var rowString = function(row) {
      var values = row.values;
      var valueStrings = values.map(TableManager.valueString);
      return valueStrings.join("|");
    };

    return rows.map(rowString).indexOf(rowString(row)) >= 0;
  },
  hasPositiveRow: function(tableName, row) {
    return this.hasRow(tableName, "positive", row);
  },
  hasNegativeRow: function(tableName, row) {
    return this.hasRow(tableName, "negative", row);
  },
  toggleRow: function(tableName, rowType, row) {
    if (this.hasRow(tableName, rowType, row)) {
      this.deleteRow(tableName, rowType, row);
    } else {
      this.addRow(tableName, rowType, row);
    }
  },

  labeledRowStrings: function(table, rowType) {
    var appendLabelToRow = function(row) {
      var values = row.values;
      var strings = values.map(this.valueString);
      strings.push(rowType);
      strings.push(JSON.stringify(row.provenance));
      return strings;
    }.bind(this);
    return table[rowType].map(appendLabelToRow);
  },
  table2csv: function(table) {
    // Get string arrays representing the rows, with a label column added
    // to the end.
    var posRows = this.labeledRowStrings(table, 'positive');
    var negRows = this.labeledRowStrings(table, 'negative');
    var allRows = posRows.concat(negRows);
    // Add a header row with column names.
    var headerRow = table.cols.slice(0);
    headerRow.push('label');
    headerRow.push('provenance');
    allRows.unshift(headerRow);
    // Return as a string.
    return allRows.map(function(row) {
      return row.join("\t");
    }).join("\n");
  },
};
module.exports = TableManager;
