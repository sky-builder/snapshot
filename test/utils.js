const mg = require('merge-img')
const fs = require('fs')
const util = require("util");

async function waitForFns(page, fns) {
  let promiseArr = [];
  fns.forEach((fn) => {
    let ps = page.waitForFunction(fn)
    promiseArr.push(ps);
  })
  await Promise.all(promiseArr);
}

async function takeFullPageScreenShot(page, from) {
  const bugMaxHeight = 16 * 1024;
  const dpr = page.viewport().deviceScaleFactor || 1;
  const maxScreenshotHeight = Math.floor( bugMaxHeight / dpr );
  const imgArr = [];
  const body = await page.$('body');
  // TODO: boundingBox vs boxModel
  const contentSize = await body.boundingBox(); 
  await page.setViewport({
    width: Math.ceil(contentSize.width),
    height: Math.ceil(contentSize.height)
  })
  // 小于16 * 1024像素高的图片直接截图
  if ( contentSize.height < maxScreenshotHeight ) {
    // 防止意外发生未关闭标签页造成内存爆炸
    // let timeoutID = setTimeout( () => page.close(), 2e4 )

    // let image = await page.screenshot( {
    //   fullPage: true
    // } ).then( buffer => ( clearTimeout( timeoutID ), page.close(), buffer ) );
    const image = await page.screenshot({
      fullPage: true
    })
    return image;
  }
  // 大于16 * 1024高度的图片循环截图 放在系统提供的缓存里
  let index = 1;
  let mh = contentSize.height;
  for ( let ypos = 0; ypos < mh; ypos += maxScreenshotHeight ) {
    const height = Math.min( mh - ypos, maxScreenshotHeight );
    let tmpName = `./tmp/${from ? from + '-' : ''}section-${index}.png`;
    index += 1;
    await page.screenshot({
      path: tmpName,
      clip: {
        x: 0,
        y: ypos,
        width: contentSize.width,
        height
      }
    }) 
    imgArr.push( tmpName )
  }
  let mgImg = await mg(imgArr, {
  // merge image vertically
    direction: true
  });
  mgImg.writePromise = util.promisify(mgImg.write);
  await mgImg.writePromise(`./tmp/${name}-pdf.png`);
  image = fs.readFileSync(`./tmp/${name}-pdf.png`);
  // TODO: clean resources
  return image;
}
async function getClipList(page, from) {
  const bugMaxHeight = 16 * 1024;
  const dpr = page.viewport().deviceScaleFactor || 1;
  const maxScreenshotHeight = Math.floor( bugMaxHeight / dpr );
  const body = await page.$('body');
  // TODO: boundingBox vs boxModel
  const contentSize = await body.boundingBox(); 
  await page.setViewport({
    width: Math.ceil(contentSize.width),
    height: Math.ceil(contentSize.height)
  })
  let mh = contentSize.height;
  let clipList = [];
  for ( let ypos = 0; ypos < mh; ypos += maxScreenshotHeight ) {
    const height = Math.min( mh - ypos, maxScreenshotHeight );
    let clip = {
      x: 0,
      y: ypos,
      width: contentSize.width,
      height
    }
    clipList.push(clip);
  }
  return clipList;
}
async function drillingRunner(browser, option) {
  const {
    name,
    waitArr,
    cookie,
    host,
    PAGE_TIMEOUT,
    drillingSelector,
    studentDialogSelector
  } = option;
  let {
    path
  } = option;
  if (process.env.NODE_ENV === 'dev') {
    path = path.replace('/report', '');
  }
    console.log('start running', name, path)
    const page = await browser.newPage();
    // await page.setViewport({width: 800, height: 600, deviceScaleFactor: 0.8})
    page.setDefaultTimeout(PAGE_TIMEOUT);
    await page.setCookie(cookie);
    const URL = `${host}${path}`
    console.log('goto ', URL)
    try {
      await page.goto(URL, {
        // 等待页面加载, 直到 500ms 内没有网络请求
        // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
          waitUntil: "networkidle0",
        }
      );
      console.log(name, 'waiting elements')
      await waitForFns(page, waitArr);
      console.log(name, 'select')
      const drillingEl = await page.$(drillingSelector);
      console.log(name, 'click')
      await drillingEl.click();
      console.log(name, 'wait for .student-dialog')
      const studentDialog = await page.waitForSelector(studentDialogSelector, {
        visible: true
      });
      console.log(name, 'wait for table')
      await page.waitForFunction('document.querySelectorAll(".student-dialog .el-table")')
      await page.waitForFunction('document.querySelector(".student-dialog .el-loading-mask").style.display === "none"')
      console.log(name, 'taking screenshot')
      const image = await studentDialog.screenshot();
      expect(image).toMatchImageSnapshot()
      console.log('stop running', name)
    } catch (error) {
      await page.screenshot({path: `./tmp/${name}-error.png`})
      throw error;
    }
}
async function pdfRunner(browser, option) {
  const {
    name,
    waitArr,
    cookie,
    host,
    PAGE_TIMEOUT
  } = option;
  let {
    path
  } = option;
  if (process.env.NODE_ENV === 'dev') {
    path = path.replace('/report', '');
  }
    console.log('start running', name, path)
    const page = await browser.newPage();
    // await page.setViewport({width: 800, height: 600, deviceScaleFactor: 0.8})
    page.setDefaultTimeout(PAGE_TIMEOUT);
    await page.setCookie(cookie);
    const URL = `${host}${path}`
    console.log('goto ', URL)
    await page.goto(URL, {
      // 等待页面加载, 直到 500ms 内没有网络请求
      // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
        waitUntil: "networkidle0",
      }
    );
    console.log(name, 'waiting elements')
    await waitForFns(page, waitArr);
    
    console.log(name, 'waiting screenshot')
    let clipList = await getClipList(page);
    // decrease fail rates
    await page.waitFor(2000);
    return {page, clipList};
}

async function testRunner(browser, option) {
  const {
    name,
    waitArr,
    cookie,
    host,
    PAGE_TIMEOUT
  } = option;
  let {
    path
  } = option;
  // if (process.env.NODE_ENV === 'dev') {
  //   path = path.replace('/report', '');
  // }
    console.log('start running', name, path)
    const page = await browser.newPage();
    // await page.setViewport({width: 800, height: 600, deviceScaleFactor: 0.8})
    page.setDefaultTimeout(PAGE_TIMEOUT);
    await page.setCookie(cookie);
    const URL = `${host}${path}`
    console.log('goto ', URL)
    try {
      await page.goto(URL, {
        // 等待页面加载, 直到 500ms 内没有网络请求
        // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
          waitUntil: "networkidle0",
        }
      );
      console.log(name, 'waiting elements')
      await waitForFns(page, waitArr);
      
      console.log(name, 'waiting screenshot')
      let image = await takeFullPageScreenShot(page);

      console.log(name, 'waiting assertion')
      expect(image).toMatchImageSnapshot()
      await page.close();
      console.log('stop running', name)
    } catch (error) {
      await page.screenshot({path: `./tmp/${name}-error.png`})
      throw error;
    }
}

async function ZoubanStudentReportRunner(browser, config) {
  const {
    name,
    cookie,
    PAGE_TIMEOUT,
    waitArr,
    path,
    host
  } = config;
  const page = await browser.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);
  await page.setCookie(cookie);

  const REPORT_URL = `${host}${path}}`
  await page.goto(REPORT_URL, {
    waitUntil: "networkidle0"
  });
  try {
    await page.waitForFunction(`document.querySelectorAll('.el-select').length === 3`)
    const dropDownList = await page.$$('.el-select');
    // trigger banji dropdown
    await dropDownList[0].click();
    await page.waitFor(1000);
    // wait for banji list appears
    const getActiveDropdownListFirstItem = async () => {
      let dropdownList =  await page.$$('.el-select-dropdown');
      let psList = [];
      dropdownList.forEach(item => {
        psList.push(item.boxModel());
      })
      let results = await Promise.all(psList);
      let activeIndex = results.findIndex(item => item);
      let activeList = dropdownList[activeIndex];
      let firstItem = await activeList.$('.el-select-dropdown__list > li')
      return firstItem;
    }
    let target = await getActiveDropdownListFirstItem();
    // select first banji
    await target.click();
    // after select subject, banjis can be found from examInfo, no need to wait for response
    await page.waitFor(1000);
    // trigger students dropdown
    await dropDownList[1].click();
    await page.waitFor(1000);
    target = await getActiveDropdownListFirstItem();
    await target.click();
    await page.waitForResponse((res) => res.url().includes('/report/obt/v2/student/list'))

    await dropDownList[2].click();
    await page.waitFor(1000);
    // find first student
    target = await getActiveDropdownListFirstItem();
    // click first student
    await target.click();

    // wait for render complete
    await waitForFns(page, waitArr);

    let image = await takeFullPageScreenShot(page);
    expect(image).toMatchImageSnapshot();

  } catch (e) {
    let errorImagePath = `./tmp/${name}-error.png`;
    await page.screenshot({path: errorImagePath, fullPage: true})
    throw e;
  }
}

async function xgkKnowledgeReportRunner(browser, config) {
  const {
    report,
    pdf,
    PAGE_TIMEOUT,
    cookie,
    host
  } = config;
  const page = await browser.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);
  await page.setCookie(cookie);

  const REPORT_URL = `${host}${report.path}`
  console.log('loading page', REPORT_URL)
  await page.goto(REPORT_URL, {
      // 等待页面加载, 直到 500ms 内没有网络请求
      // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
      waitUntil: "networkidle0",
    }
  );
    try {
    console.log('waiting elements', REPORT_URL)
    await waitForFns(page, report.waitArr)

    // 查看 pdf 按钮
    let button = await page.$('.total-title-btn');

    console.log('waiting pdf', REPORT_URL)
    // pdf 页面
    const [popup] = await Promise.all([
      new Promise(resolve => page.once('popup', resolve)),
      button.click()
    ]);

    await popup.waitFor(1000)
    console.log('waiting pdf elements', REPORT_URL);
    await waitForFns(popup, pdf.waitArr);
    const image = await takeFullPageScreenShot(popup, 'knowledge');
    expect(image).toMatchImageSnapshot();
  } catch (error) {
    await page.screenshot({fullPage: true, path: 'error.png'})
    throw error;
  }
}

module.exports = {
  drillingRunner,
  ZoubanStudentReportRunner,
  testRunner,
  pdfRunner
}