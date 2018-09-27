const puppeteer = require('puppeteer');
const moment = require('moment');
const ejs = require('ejs');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');

const selectors = {
  item: '._1m-2ED6C',
  // month: '._2uPIj-wb',
  // dayOfMonth: '._3al4E82b',
  // time: '.d6Vv5DEm div:nth-child(3)',
  name: '._1m-2ED6C',

  time: 'time:first-of-type'
};

const showMore = '._1pWqBljl';

const dayFormat = 'ddd, MMM Do';

async function getData() {
  const browser = await puppeteer.launch({args: ['--no-sandbox'], headless: false});
  const page = await browser.newPage();
  await page.goto('https://student.naviance.com/fairview/guest');
  await page.waitFor('#password');

  // await page.click('#password');
  await page.type('#password', 'knights');
  await page.keyboard.press('Enter');
  await page.waitForNavigation({
    waitUntil: 'networkidle0'
  });
  await page.goto('https://student.naviance.com/main');
  // await page.waitFor(selectors.item);
  await page.waitFor(showMore);
  await page.click(showMore);

  const collegeData = await page.evaluate(selectors => {
    return [...document.querySelectorAll(selectors.item)].map(college => {
      const text = college.innerText;
      return {
        time: college.querySelector(selectors.time).getAttribute('datetime'),
        name: text.split('will be visiting your school')[0]
      }
    })
  }, selectors);

  // const collegeData = await page.evaluate(selectors => {
  //   return [...document.querySelectorAll(selectors.item)].map(college => {
  //     return Object.keys(selectors)
  //       .filter(selector => selector !== 'item')
  //       .reduce((prevObject, currSelect) => {
  //         return {
  //           ...prevObject,
  //           [currSelect]: college.querySelector(selectors[currSelect]).innerText
  //         }
  //       }, {});
  //   })
  // }, selectors);

  await browser.close();

  const collegeWithDatetime = collegeData.map(college => {
    // const {
    //   month,
    //   dayOfMonth,
    //   time,
    //   name
    // } = college;
    // return {
    //   name,
    //   datetime: moment(`${month} ${dayOfMonth} ${time}`, 'MMMM DD hh:mma')
    // }
    const {
      time,
      name
    } = college;
    return {
      name,
      datetime: moment(time, 'YYYY-MM-DD HH:mm:ss')
    }
  });

  // console.log(collegeWithDatetime);

  const firstCollegeWeek = collegeWithDatetime.reduce((prevWeek, college) => {
    const collegeWeek = college.datetime.week();
    return collegeWeek < prevWeek ? collegeWeek : prevWeek;
  }, 52);

  const lastCollegeWeek = collegeWithDatetime.reduce((prevWeek, college) => {
    const collegeWeek = college.datetime.week();
    return collegeWeek > prevWeek ? collegeWeek : prevWeek;
  }, 1);

  const weeks = [];

  for (let week = firstCollegeWeek; week <= lastCollegeWeek; week++) {
    const days = [];
    for (let day = 0; day < 7; day++) {
      const dayMoment = moment(`${day} ${week}`, 'e ww');

      days.push({
        day: dayMoment.format(dayFormat),
        visits: []
      });
    }
    weeks[week - firstCollegeWeek] = days;
  }

  // console.log(collegeWithDatetime);

  collegeWithDatetime.forEach(college => {
    const {
      datetime
    } = college;
    const dayMoment = datetime.format(dayFormat);
    // console.log(dayMoment);
    weeks.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        if (day.day === dayMoment) {
          weeks[weekIndex][dayIndex].visits.push({
            name: college.name,
            time: college.datetime.format('h:mma')
          })
        }
      })
    })
  });

  const template = ejs.compile(await promisify(fs.readFile)(path.join(__dirname, 'college_rep_visits.ejs'), 'utf-8'));

  const rendered = template({
    weeks,
    updated: moment().format('dddd, MMMM, Do YYYY h:mm a')
  });

  await promisify(fs.writeFile)(path.join(__dirname, 'college_rep_visits.html'), rendered);

  // await page.waitForNavigation({ waitUntil: 'networkidle0' });

}

module.exports = {
  getData
};