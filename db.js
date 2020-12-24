const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ TestResults: []})
  .write()


// db.get("TestResults")


// .push({
//   id: 1,
//   startTime: new Date().getTime()
// })
// .write();