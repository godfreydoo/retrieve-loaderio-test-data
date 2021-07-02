const converter = require('json-2-csv');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();



// Define your test duration

var duration = 30000; // in ms, ie. 60 seconds
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
    var testid = testData[i].test_id;
    var details = {};
    details.name = testData[i].name;
    details.total_clients = testData[i].total;
    details.duration = testData[i].duration;
    details.testidx = testid;

    results[testid] = details;
  }
  return results;
}

LoaderIOTests.prototype.runTestAndSaveResultId = async function(testidx, name) {
  console.log(`${name} is running...`);

  const config = {
    method: 'put',
    url: `${url}/${testidx}/run`,
    headers: { 'loaderio-auth': process.env.LOADER_API_KEY }
  };

  try {
    let { data } = await axios(config);
    this._tests[testidx].resultidx = data.result_id;
  } catch (error) {
    if (error.response.status === 422) {
      console.log('Error 422 received. Try increasing the buffer time between tests. This error is most likely due to running more than one test at once or could be some lag between requests and responses; however, the script will continue to run.');
    } else {
      console.log(`Something went wrong with running testidx: ${testidx}`);
      console.error(error);
    }
  }
}

LoaderIOTests.prototype.getTestResults = async function(testidx, resultidx, name, duration, totalClients) {
  const config = {
    url: `${url}/${testidx}/results/${resultidx}`,
    headers: {
      'loaderio-auth': process.env.LOADER_API_KEY
    }
  }
  try {
    let { data } = await axios(config);
    data.name = name;
    data.duration = duration;
    data.total_clients = totalClients;
    this._testResults.push(data);
  } catch (error) {
    console.log(`Something went wrong with fetching test results for resultidx: ${resultidx}`);
    console.error(error);
  }
}

LoaderIOTests.prototype.write2CSV = async function(datetime) {
  const writeCSVStream = fs.createWriteStream(`results_${datetime}.csv`);
  await converter.json2csv(this._testResults, (err, csv) => {
    if (err) {
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
    for (var key in newRun._tests) {
      await sleep(newRun.runTestAndSaveResultId(key, newRun._tests[key].name));
    }
    console.log('All tests ran...');
    console.log('Fetching data and writing to CSV file...');
    for (var key in newRun._tests) {
      var test = newRun._tests[key];
      await newRun.getTestResults(key, test.resultidx, test.name, test.duration, test.total_clients)
    }
    const datetime = new Date();
    newRun.write2CSV(datetime);
    console.log('results.csv file should be created / updated soon');
  } catch (error) {
    console.log('Double check the duration + buffer is accurate for your test settings');
    console.error(error);
  }
}

run();
