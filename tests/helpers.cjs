const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const targetRow = this.row - 1 + r;
      while (this.sheet.data.length <= targetRow) this.sheet.data.push([]);
      for (let c = 0; c < values[r].length; c++) {
        this.sheet.data[targetRow][this.col - 1 + c] = values[r][c];
      }
    }
    return this;
  }

  setValue(value) {
    while (this.sheet.data.length < this.row) this.sheet.data.push([]);
    this.sheet.data[this.row - 1][this.col - 1] = value;
    return this;
  }

  setFontWeight() {
    return this;
  }
}

class FakeSheet {
  constructor(name, data) {
    this.name = name;
    this.data = data || [];
    this.frozenRows = 0;
  }

  getDataRange() {
    return { getValues: () => this.data };
  }

  getLastRow() {
    return this.data.length;
  }

  getRange(row, col, numRows, numCols) {
    return new FakeRange(this, row, col, numRows, numCols);
  }

  setFrozenRows(rows) {
    this.frozenRows = rows;
  }

  appendRow(row) {
    this.data.push(row);
  }
}

class FakeSpreadsheet {
  constructor(sheets) {
    this.sheets = sheets || {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const sheet = new FakeSheet(name);
    this.sheets[name] = sheet;
    return sheet;
  }
}

function loadApp(files, extra) {
  const props = Object.assign({}, extra && extra.props);
  const logs = [];
  const context = Object.assign({
    console,
    Date,
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            return props[name] || '';
          },
          setProperty(name, value) {
            props[name] = value;
          }
        };
      }
    },
    Utilities: {
      formatDate(date) {
        const d = new Date(date);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      },
      newBlob(value) {
        return {
          getBytes() {
            return Buffer.from(String(value));
          }
        };
      },
      base64Encode(bytes) {
        return Buffer.from(bytes).toString('base64');
      }
    },
    ScriptApp: {
      WeekDay: { MONDAY: 'MONDAY' },
      _triggers: [],
      getProjectTriggers() {
        return this._triggers;
      },
      deleteTrigger(trigger) {
        this._triggers = this._triggers.filter((t) => t !== trigger);
      },
      newTrigger(fn) {
        const trigger = {
          fn,
          getHandlerFunction: () => fn,
          timeBased() { return this; },
          atHour() { return this; },
          nearMinute() { return this; },
          everyDays() { return this; },
          onWeekDay() { return this; },
          everyWeeks() { return this; },
          inTimezone() { return this; },
          create: () => { context.ScriptApp._triggers.push(trigger); return trigger; }
        };
        return trigger;
      }
    }
  }, extra || {});

  context.__logs = logs;
  vm.createContext(context);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  return context;
}

module.exports = { FakeSheet, FakeSpreadsheet, loadApp };
