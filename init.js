/**
 * init environment
 * create necessary files if not exists
 */

const fs = require('fs')
const path = require('path')

function createIfNotExist(filePath, fileType) {
  const isExists = fs.existsSync(filePath);
  if (!isExists) {
    if (fileType === 'file') {
      fs.writeFileSync(filePath)
    }
    if (fileType === 'dir') {
      fs.mkdirSync(filePath)
    }
  }
}
const dbFile = path.join(__dirname, 'db.json')
const results = path.join(__dirname, 'results')

createIfNotExist(dbFile, 'file')
createIfNotExist(results, 'dir')

