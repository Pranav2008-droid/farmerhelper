var Gpio = require('onoff').Gpio;
var motor = new Gpio(4, 'out');
motor.writeSync(1);

function turnOnMotor() {
  if (motor.readSync() === 1) {
    motor.writeSync(0);
  }
}

function turnOffMotor() {
  if (motor.readSync() === 0) {
    motor.writeSync(1);
  }
}

module.exports = {turnOnMotor, turnOffMotor};
