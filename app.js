/**
 * 遍历表头，根据业务需求，给某些列添加 fixed 和 width 属性
 * @param {Array} header excel 表头, 格式定义: http://wiki.iyunxiao.com/pages/viewpage.action?pageId=399479176
 */
function formatHeader(header) {
  let result = header.map(item => {
    let isFixed = getIsFixed(item.label);
    let width = getWidth(item.label);
    return {
      isFixed,
      width,
      ...item
    }
  })
  return result;
}

/**
 * 判断某列是否固定列
 * @param {Object} obj 
 */
function getIsFixed(obj) {
  return true;
}

/**
 * 获取某列的宽度
 * @param {header} obj 
 */
function getWidth(obj) {
  return 100;
}

module.exports = formatHeader;
