const parentConfig = require("../config.js");
const config = Object.assign(parentConfig, {
  host: parentConfig.host,
  userInfo: {
    id: "15160567158",
    pwd: '',
    name: "李素馨",
  },

})

module.exports = config;