var Types = require('../common/types');
var firebase = require('firebase/app');
var motor = require('./motor');
var Gpio = require('onoff').Gpio;
var current = new Gpio(20, 'in', 'both');
var Status = Types.Status;
var motorState = Status.OFF;
var powerState = Status.OFF;
var timeDiff = 0;
var debug = true;

require('firebase/database');

var firebaseConfig = {
  apiKey: 'AIzaSyBNubXY2SjdcIy5u36Cy2_hO6lhpu-mW04',
  authDomain: 'farmerhelper-70abb.firebaseapp.com',
  databaseURL: 'https://farmerhelper-70abb.firebaseio.com',
  projectId: 'farmerhelper-70abb',
  storageBucket: 'farmerhelper-70abb.appspot.com',
  messagingSenderId: '187476232499',
  appId: '1:187476232499:web:57c36aef8e9146bdfb5646',
};

console.log('\n');
debugLog('Starting motor controller');
console.log('\n');

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var realtimeDb = firebase.database();

function debugLog(msg) {
  if (debug) {
    var currentTime = new Date();
    var dateString =
      ('0' + currentTime.getDate()).slice(-2) +
      '-' +
      ('0' + (currentTime.getMonth() + 1)).slice(-2) +
      '-' +
      currentTime.getFullYear() +
      ' ' +
      ('0' + currentTime.getHours()).slice(-2) +
      ':' +
      ('0' + currentTime.getMinutes()).slice(-2) +
      ':' +
      ('0' + currentTime.getSeconds()).slice(-2) +
      '.' +
      ('00' + currentTime.getMilliseconds()).slice(-3);
    console.log(dateString + ': ' + msg);
  }
}
function getCurrentServerTime() {
  return new Promise((resolve, reject) => {
    realtimeDb
      .ref('/')
      .update({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      })
      .then(() => {
        realtimeDb
          .ref('/timestamp')
          .once('value')
          .then((data) => {
            resolve(data.val());
          })
          .catch(() => {
            resolve(Date.now());
          });
      })
      .catch(() => {
        resolve(Date.now());
      });
  });
}

function updateSystemStatus() {
  debugLog('powerState = ' + powerState);
  var ref = firebase.database().ref('/systemStatus');
  ref
    .update({
      motorState: motorState,
      powerState: powerState,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    })
    .then(() => {
      debugLog('Status updated successfully');
    })
    .catch((err) => {
      debugLog('Updating status failed. ' + err);
    });
}

async function getTimeDiff() {
  var serverTime = (await getCurrentServerTime()) / 1000;
  var localCurTime = Date.now() / 1000;
  debugLog('Server time = ' + serverTime);
  debugLog('Local time = ' + localCurTime);
  timeDiff = parseInt(localCurTime - serverTime, 10);
  return timeDiff;
}

function dbUpdateHandler(data) {
  var localTime = Date.now();
  debugLog('dbUpdateHandler data = ' + data.val());
  firebase
    .database()
    .ref('/command/timestamp')
    .once('value', (timeStampData) => {
      var commandTimestamp = parseInt(timeStampData.val(), 10);
      var commandRef = null;
      var timeSinceCmdRequested = localTime + timeDiff - commandTimestamp;
      debugLog('commandTimeStamp = ' + commandTimestamp);
      debugLog('localTime = ' + localTime);
      debugLog('time diff = ' + timeDiff);
      debugLog('timeSinceCmdRequested = ' + timeSinceCmdRequested);
      if (timeSinceCmdRequested < 1800) {
        if (data.val() === 'prepareStart') {
          debugLog('Ready to start the motor');
          commandRef = firebase.database().ref('/command/');
          commandRef
            .update({
              response: 'ready',
            })
            .then(() => {})
            .catch((err) => {
              debugLog(
                'Error while while acknowledging ready state to start the motor.' +
                  err,
              );
            });
        }
        if (data.val() === 'confirmStart') {
          debugLog('Starting the motor');
          turnOnMotor();
          commandRef = firebase.database().ref('/command/');
          commandRef
            .update({
              request: '',
            })
            .then(() => {})
            .catch((err) => {
              debugLog(
                'Motor started. But error while acknowledging start command.' +
                  err,
              );
            });
        }
        if (data.val() === 'stop') {
          debugLog('Stopping the motor');
          turnOffMotor();
          commandRef = firebase.database().ref('/command/');
          commandRef
            .update({
              request: '',
              response: 'stopped',
            })
            .then(() => {})
            .catch((err) => {
              debugLog(
                'Motor stopped. But error while acknowledging stop command.' +
                  err,
              );
            });
        }
      }
    });
}

function turnOnMotor() {
  motor.turnOnMotor();
  motorState = Status.ON;
  updateSystemStatus();
}

function turnOffMotor() {
  motor.turnOffMotor();
  motorState = Status.OFF;
  updateSystemStatus();
}

getTimeDiff().then((diff) => {
  debugLog('Local time diff with server timestamp = ' + diff);
  var ref = firebase.database().ref('/command/request');
  ref.on('value', dbUpdateHandler);
});

if (current.readSync() === 1) {
  powerState = Status.ON;
} else {
  powerState = Status.OFF;
}
updateSystemStatus();

current.watch(function (err, value) {
  if (err) {
    debugLog('Error while watching current status ' + err);
    return;
  }
  if (value === 0) {
    if (powerState === Status.ON) {
      debugLog('Power state change from on to off');
      powerState = Status.OFF;
      if (motorState === Status.ON) {
        debugLog('Changing motor state to off due to power failure');
        turnOffMotor();
      } else {
        updateSystemStatus();
      }
    } else {
      // We should never reach here as powerState should be ON when the value is 0
      debugLog('Power state is already off');
    }
  } else if (value === 1) {
    if (powerState === Status.OFF) {
      powerState = Status.ON;
      updateSystemStatus();
    } else {
      debugLog('Power state is already on');
    }
  } else {
    debugLog('Unknown value(' + value + ') received in current.watch');
  }
});

setInterval(function () {
  updateSystemStatus();
}, 30000);
