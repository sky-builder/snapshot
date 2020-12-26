const NODE_ENV = process.env.NODE_ENV;
const envHostMap = {
  'dev': "http://dev.haofenshu.com:8080",
  'test': 'http://test-fenxi.haofenshu.com',
  'gray': 'http://sandboxfenxi.haofenshu.com',
  'production': 'http://fenxi.haofenshu.com',
}
module.exports = {
  // page timeout 10mins, should smaller than jest.config.js
  PAGE_TIMEOUT: 1000 * 60 * 10,
  host: envHostMap[NODE_ENV],
  getLoginApi: (userId) => `http://testyezhi.haofenshu.com/api/hfsfx/fxyz/v1/fx/200511/yj-token?username=${userId}&password=`
}