const fs = require('fs')
const util = require("util");
const path = require('path');
const axios = require('axios')
const mg = require('merge-img')
const puppeteer = require("puppeteer");
const { toMatchImageSnapshot } = require("jest-image-snapshot");

const config = require("./config");
const reportList = require('./report-list.json');

let cookie;
let browser;

const loginApi = config.getLoginApi(config.userInfo.id);
const PAGE_TIMEOUT = 60 * 1000 * 5;

expect.extend({ toMatchImageSnapshot });

beforeAll(async (done) => {
  browser = await puppeteer.launch(
    {
      // headless: false,
      args: [ 
        '--no-sandbox', 
        '--disable-dev-shm-usage'
      ]
    }
  );
  let res = await axios.get(loginApi);
  let token = res.data.data.token;
  cookie = {
    name: 'fxtoken',
    value: token,
    domain: '.haofenshu.com',
  }
  done();
});

let examDesc = `${config.examInfo.name}(${config.examInfo.id})`;
let userDesc = `${config.userInfo.name}(${config.userInfo.id})`;

async function waitForFns(page, fns) {
  let promiseArr = [];
  fns.forEach((fn) => {
    let ps = page.waitForFunction(fn)
    promiseArr.push(ps);
  })
  await Promise.all(promiseArr);
}
async function testRunner(report, option) {
  const {
    path,
    name,
    waitArr
  } = option;
  console.log('start running', report, name, path)
  const page = await browser.newPage();
  // await page.setViewport({width: 800, height: 600, deviceScaleFactor: 0.8})
  page.setDefaultTimeout(PAGE_TIMEOUT);
  await page.setCookie(cookie);
  const URL = `${config.host}${path}`
  await page.goto(URL, {
    // 等待页面加载, 直到 500ms 内没有网络请求
    // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
    waitUntil: "networkidle0",
  }
);
  console.log(report, name, 'waiting elements')
  await waitForFns(page, waitArr);
  
  console.log(report, name, 'waiting screenshot')
  let image = await takeFullPageScreenShot(page);
  await page.close();

  console.log(report, name, 'waiting assertion')
  expect(image).toMatchImageSnapshot()
  console.log('stop running', report, name)
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

function myDescribe(name, cb) {
  let item = reportList.find(item => item.name === name);
  if (item.isSkip) {
    return describe.skip(name, cb)
  } else {
    return describe(name, cb);
  }
}

describe(userDesc, () => {
  describe(examDesc, () => {
    // TODO: filter custom runner
    const list = reportList.filter(item => !item.isCustom);
    console.log({list})
    for(let i = 0; i < list.length; i += 1) {
      test(list[i].name, async () => {
        await testRunner(list[i].name, list[i])
      })
    }
    test('学生成绩分析', async () => {
      // throw new Error('yes')
      const page = await browser.newPage();
      page.setDefaultTimeout(PAGE_TIMEOUT);
      await page.setCookie(cookie);
  
      const REPORT_PATH = '/report/student?examid=43257-84&org=2&grade=直升初二';
      const REPORT_URL = `${config.host}${REPORT_PATH}`
      await page.goto(REPORT_URL, {
        waitUntil: "networkidle0"
      });
      try {
        await page.waitForFunction(`document.querySelectorAll('.el-select').length === 2`)
        const dropDownList = await page.$$('.el-select');
        // trigger banji dropdown
        await dropDownList[0].click();
        await page.waitFor(1000);
        // wait for banji list appears
        let dropdownArr1 = await page.$$('.el-select-dropdown');
        let firstDropdown1 = await dropdownArr1[0].boxModel();
        let activeDropdown1 = firstDropdown1 ? dropdownArr1[0] : dropdownArr1[1];
        let list = await activeDropdown1.$('.el-select-dropdown__list > li')
        // select first banji
        await list.click();
        // wait for students response
        await page.waitForResponse((res) => res.url().includes('/report/obt/v2/student/list'))
        // trigger students dropdown
        await dropDownList[1].click();
        await page.waitFor(1000);
        let dropdownArr = await page.$$('.el-select-dropdown');
        let firstDropdown = await dropdownArr[0].boxModel();
        let activeDropdown = firstDropdown ? dropdownArr[0] : dropdownArr[1];
        // find first student
        let target = await activeDropdown.$('.el-select-dropdown__list > li')
        // click first student
        await target.click();
        // wait for render complete
        await page.waitForFunction(`document.querySelectorAll('.el-table').length === 2`)
        await page.waitForFunction(`document.querySelectorAll('canvas').length === 1`)

        let image = await takeFullPageScreenShot(page);
        expect(image).toMatchImageSnapshot();
      } catch (e) {
        let errorImagePath = `error_student-score.png`;
        await page.screenshot({path: errorImagePath, fullPage: true})
        throw e;
      }
    })
    // myDescribe('学生成绩分析', () => {
    //   test('直升初19级4班 => 丁涵', async () => {
    //     // throw new Error('yes')
    //     const page = await browser.newPage();
    //     page.setDefaultTimeout(PAGE_TIMEOUT);
    //     await page.setCookie(cookie);
    
    //     const REPORT_PATH = '/report/student?examid=43257-84&org=2&grade=直升初二';
    //     const REPORT_URL = `${config.host}${REPORT_PATH}`
    //     await page.goto(REPORT_URL, {
    //       waitUntil: "networkidle0"
    //     });
    //     try {
    //       await page.waitForFunction(`document.querySelectorAll('.el-select').length === 2`)
    //       const dropDownList = await page.$$('.el-select');
    //       // trigger banji dropdown
    //       await dropDownList[0].click();
    //       await page.waitFor(1000);
    //       // wait for banji list appears
    //       let dropdownArr1 = await page.$$('.el-select-dropdown');
    //       let firstDropdown1 = await dropdownArr1[0].boxModel();
    //       let activeDropdown1 = firstDropdown1 ? dropdownArr1[0] : dropdownArr1[1];
    //       let list = await activeDropdown1.$('.el-select-dropdown__list > li')
    //       // select first banji
    //       await list.click();
    //       // wait for students response
    //       await page.waitForResponse((res) => res.url().includes('/report/obt/v2/student/list'))
    //       // trigger students dropdown
    //       await dropDownList[1].click();
    //       await page.waitFor(1000);
    //       let dropdownArr = await page.$$('.el-select-dropdown');
    //       let firstDropdown = await dropdownArr[0].boxModel();
    //       let activeDropdown = firstDropdown ? dropdownArr[0] : dropdownArr[1];
    //       // find first student
    //       let target = await activeDropdown.$('.el-select-dropdown__list > li')
    //       // click first student
    //       await target.click();
    //       // wait for render complete
    //       await page.waitForFunction(`document.querySelectorAll('.el-table').length === 2`)
    //       await page.waitForFunction(`document.querySelectorAll('canvas').length === 1`)

    //       let image = await takeFullPageScreenShot(page);
    //       expect(image).toMatchImageSnapshot();
    //     } catch (e) {
    //       let errorImagePath = `error_student-score.png`;
    //       await page.screenshot({path: errorImagePath, fullPage: true})
    //       throw e;
    //     }
    //   })
    // })
    // myDescribe('必备知识、关键能力与学科素养分析报告', () => {
    //   test('报表', async () => {
    //     const name = '必备知识、关键能力与学科素养分析报告'
    //     const option = {
    //       name: '报表',
    //       path: '/report/knowledge?examid=43257-84&org=2&grade=直升初二',
    //       waitArr: [
    //         `document.querySelectorAll('.el-table').length === 6`,
    //         `document.querySelectorAll('canvas').length === 2`
    //       ]
    //     }
    //     await testRunner(name, option)
    //   })
    //   test('pdf', async () => {
    //     let path = '/report/knowledge?examid=43257-84&org=2&grade=直升初二';
    //     let fnList = [
    //       `document.querySelectorAll('.el-table').length === 6`,
    //       `document.querySelectorAll('canvas').length === 2`
    //     ]
    //     const page = await browser.newPage();
    //     page.setDefaultTimeout(PAGE_TIMEOUT);
    //     await page.setCookie(cookie);
      
    //     const REPORT_PATH = path;
    //     const REPORT_URL = `${config.host}${REPORT_PATH}`
    //     console.log('loading page', REPORT_URL)
    //     await page.goto(REPORT_URL, {
    //         // 等待页面加载, 直到 500ms 内没有网络请求
    //         // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
    //         waitUntil: "networkidle0",
    //       }
    //     );
    //       try {
    //       console.log('waiting elements', REPORT_URL)
    //       await waitForFns(page, fnList)

    //       // 查看 pdf 按钮
    //       let button = await page.$('.total-title-btn');

    //       console.log('waiting pdf', REPORT_URL)
    //       // pdf 页面
    //       const [popup] = await Promise.all([
    //         new Promise(resolve => page.once('popup', resolve)),
    //         button.click()
    //       ]);

    //       await popup.waitFor(1000)
    //       const pdfFnList = [
    //         // 等待页面所有图表渲染完毕
    //         `document.querySelectorAll('canvas').length === 7`,
    //         // 等待页面目录生成完毕
    //         `document.querySelectorAll('.index-tree-item').length === 9`,
    //         // 等待页面 loading 消失
    //         `document.querySelector(".el-loading-mask.is-fullscreen").style.display === "none"`
    //       ]
    //       console.log('waiting pdf elements', REPORT_URL);
    //       await waitForFns(popup, pdfFnList);
    //       const image = await takeFullPageScreenShot(popup, 'knowledge');
    //       expect(image).toMatchImageSnapshot();
    //     } catch (error) {
    //       await page.screenshot({fullPage: true, path: 'knowledge-pdf-error.png'})
    //       throw error;
    //     }
    //   })
    // })
  });
});

afterAll(async (done) => {
  await browser.close();
  done();
});
