const parentConfig = require("../config.js");
const config = Object.assign(parentConfig, {
  host: parentConfig.host,
  userInfo: {
    id: "bjssyxxadmin",
    pwd: '',
    name: "北京市十一学校超级管理员",
  },
})

module.exports = config;