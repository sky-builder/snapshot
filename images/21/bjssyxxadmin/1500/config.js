const globalConfig = require('../../config.js');
module.exports = {
  cookie: {
    name: "fxtoken",
    value:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpZCI6MTg5MjY1NzUzMDc4MTY5Niwic2VjdXNlciI6IjRjZmIzNzdkZDgxODRiYTcwYzVlODcwYWRlNmUwOTQzMjgyMjhmOTgxZjQzMmVlMzg5YTYyOGZhMDMzODBjOWUiLCJzY2hvb2xpZCI6Ijg0IiwiZnJvbSI6ImFuYWx5c2lzIiwiand0aW1lIjoxNjA2OTYxNjI2Mzg5LCJpYXQiOjE2MDY5NjE2MjZ9.T-SeByombSa6_aEEi7cON_1tbnaZSecPoAfMHqxAT5vYTDluNXzm014l-413dy_ZDE8_WlTlwpQbu_ZIhIMAiw',
    // TODO: shouldn't be hard coded
    domain: "localhost",
  },
  host: globalConfig.host,
  examInfo: {
  },
  reportList: []
};
