const NODE_ENV = process.env.NODE_ENV;
console.log({NODE_ENV})
const envHostMap = {
  'dev': "http://dev.haofenshu.com:8080",
  'test': 'http://test-fenxi.haofenshu.com',
  'gray': 'http://sandboxfenxi.haofenshu.com',
  'production': 'http://fenxi.haofenshu.com',
}
module.exports = {
  host: envHostMap[NODE_ENV],
}