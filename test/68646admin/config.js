const parentConfig = require("../config.js");
const config = Object.assign(parentConfig, {
  host: parentConfig.host,
  userInfo: {
    id: "68646admin",
    pwd: '',
    name: "海东市教育局",
  },

})

module.exports = config;