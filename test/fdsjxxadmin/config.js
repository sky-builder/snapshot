const parentConfig = require("../config.js");
const config = Object.assign(parentConfig, {
  host: parentConfig.host,
  userInfo: {
    id: "fdsjxxadmin",
    pwd: '',
    name: "福鼎市进修校",
  },

})

module.exports = config;