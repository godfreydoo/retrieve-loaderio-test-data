const converter = require('json-2-csv');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();



// Define your test duration

var duration = 30000; // in ms, ie. 30 seconds
var buffer = 5000; // in ms, i.e. 5 second buffer (I found this to be a good buffer)








// Core functions -- do not change anything below!

var url = 'https://api.loader.io/v2/tests'

function LoaderIOTests() {
  this._tests = {};
  this._testResults = [];
}

LoaderIOTests.prototype.getTests = async function() {
  const config = {
    url: url,
    headers: { 'loaderio-auth': process.env.LOADER_API_KEY }
  }

  try {
    let { data } = await axios(config);
    let extractedData = this.extractNameAndTotal(data);
    this._tests = extractedData;
  } catch (error) {
    console.log(`Something went wrong with fetching test results for resultidx: ${resultidx}`);
    console.error(error);
  }
}


LoaderIOTests.prototype.extractNameAndTotal = function(testData) {
  var results = {};
  for (var i = 0; i < testData.length; i++) {
    var details = {};
    details.name = testData[i].name;
    details.totalClients = testData[i].total;
    details.duration = testData[i].duration;
    details.testidx = testData[i].test_id;
    results[testData[i].test_id] = details;
  }
  return results;
}

LoaderIOTests.prototype.runTestAndSaveResultId = async function(testidx) {
  console.log(`${this._tests[testidx].name} is running...`);

  const config = {
    method: 'put',
    url: `${url}/${testidx}/run`,
    headers: { 'loaderio-auth': process.env.LOADER_API_KEY }
  };

  try {
    let { data } = await axios(config);
    this._tests[testidx.resultidx] = data.result_id;
  } catch (error) {
    console.log(`Something went wrong with running testidx: ${testidx}`);
    console.error(error);
  }
}


LoaderIOTests.prototype.getTestResults = async function(testidx, datetime){
  const config = {
    url: `${url}/${testidx}/results/${this._tests[textidx].resultidx}`,
    headers: {
      'loaderio-auth': process.env.LOADER_API_KEY
    }
  }
  debugger;
  try {
    let { data } = await axios(config);
    data.name = this._tests[testidx].name;
    data.totalClients = this._tests[testidx].totalClients;
    data.duration = this._tests[testidx].duration;
    this.write2CSV(datetime);
    this._testResults.push(data);
  } catch (error) {
    console.log(`Something went wrong with fetching test results for resultidx: ${resultidx}`);
    console.error(error);
  }
}

LoaderIOTests.prototype.write2CSV = async function(datetime) {
  const writeCSVStream = fs.createWriteStream(`results_${datetime}.csv`);
  await converter.json2csv(this._testResults, (err, csv) => {
    if (error) {
      console.log('Writing from json2csv has an error: ', err);
      return;
    }
    writeCSVStream.write(csv);
  })
}

function sleep(fn) {
  return new Promise(resolve => setTimeout(resolve, duration + buffer));
}


async function run() {
  var newRun = new LoaderIOTests;
  try {
    console.log('Retrieving your test data...');
    await newRun.getTests();
    console.log('Starting to run tests...');


    for (var testidx in newRun._tests) {
      await sleep(newRun.runTestAndSaveResultId(testidx));
    }
    console.log('All tests ran...');
    console.log('Fetching data and writing to CSV file...');

    const datetime = Date.now();

    for (var key in newRun._tests) {
      await newRun.getTestResults(key, datetime)
    }
    console.log('results.csv file should be created / updated soon');
  } catch (error) {
    console.log('Double check the duration + buffer is accurate for your test settings');
    console.error(error);
  }
}

run();
