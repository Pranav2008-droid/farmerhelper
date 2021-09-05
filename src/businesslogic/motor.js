import {MotorApi} from '../backend';

export default class Motor {
  static turnOn() {
    return new Promise(async (resolve, reject) => {
      var readyStateListenerObj = null;
      var readyStateListenerTimeout = null;

      //Step 1: Send the prepare request to raspberry pi (through database)
      try {
        await MotorApi.prepareStart();
      } catch (error) {
        console.log('Motor.turnOn: Error while sending prepareStart ' + error);
        reject(error);
      }
      //Step 2: Listen for ready state update from raspberry pi
      readyStateListenerObj = MotorApi.registerReadyStateListener(async () => {
        if (readyStateListenerTimeout) {
          clearTimeout(readyStateListenerTimeout);
          MotorApi.unregisterReadyStateListener(readyStateListenerObj);
          readyStateListenerObj = null;

          //Step 3: Send confirmation request to raspberry pi(through databse)
          try {
            await MotorApi.confirmStart();
            resolve();
          } catch (error) {
            console.log(
              'Motor.turnOn: Error while sending confirmStart ' + error,
            );
            reject(error);
          }
        } /* else {
            If readyStateListenerTimeout is null, it indicates that the timeout processing
            has already happened. So timeout processing would have already called reject. 
            So nothing to do here.
          }*/
      });
      //Wait for 30 seconds for ready state response from raspberry pi
      readyStateListenerTimeout = setTimeout(() => {
        //Timeout happened.
        readyStateListenerTimeout = null;

        //Unregister the ready state listener
        MotorApi.unregisterReadyStateListener(readyStateListenerObj);
        readyStateListenerObj = null;
        console.log(
          'Motor.turnOn: Timeout occurred while waiting for ready state',
        );
        reject('timeout');
      }, 30000);
    });
  }
  static turnOff() {
    return new Promise(async (resolve, reject) => {
      var stopStateListenerObj = null;
      var stopStateListenerTimeout = null;
      //Step : 1 send the stop signal to the raspberry pi
      try {
        await MotorApi.stop();
      } catch (error) {
        console.log('Motor.turnOn: Error while sending confirmStart ' + error);
        reject(error);
      }
      //Step : 2 wait for the return signal from the raspberry pi
      stopStateListenerObj = MotorApi.registerStopStateListener(async () => {
        if (stopStateListenerTimeout) {
          clearTimeout(stopStateListenerTimeout);
          resolve();
          MotorApi.unregisterStopStateListener(stopStateListenerObj);
          stopStateListenerObj = null;
        }
      });
      stopStateListenerTimeout = setTimeout(() => {
        //30 seconds over
        stopStateListenerTimeout = null;
        MotorApi.unregisterStopStateListener(stopStateListenerObj);
        stopStateListenerObj = null;
        console.log(
          'Motor.turnOff: Timout occured while waiting for response from raspberry pi',
        );
        reject('timeout');
      }, 30000);
    });
  }
  static updateSystemStatus() {
    return new Promise(async (resolve, reject) => {
      try {
        await MotorApi.updateSystemStatus();
        resolve();
      } catch (error) {
        console.log('Motor.turnOn: Error while sending confirmStart ' + error);
        reject(error);
      }
    });
  }
  static registerMotorStateListener(motorStateListener) {
    return MotorApi.registerMotorStateListener(motorStateListener);
  }
  static unregisterMotorStateListener(motorStateListenerObj) {
    return MotorApi.unregisterMotorStateListener(motorStateListenerObj);
  }
}
