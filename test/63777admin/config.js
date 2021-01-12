const parentConfig = require("../config.js");
const config = Object.assign(parentConfig, {
  host: parentConfig.host,
  userInfo: {
    id: "63777admin",
    pwd: '',
    name: "海东市互助县教育局教研室超级管理员",
  },

})

module.exports = config;