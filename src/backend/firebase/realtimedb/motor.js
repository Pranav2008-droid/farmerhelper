import database from '@react-native-firebase/database';
const prefix = ''
export default class MotorApi {
  static prepareStart(runSchedule) {
    const dbRef = database().ref(prefix + '/');
    return dbRef.update({
      command: {
        request: 'prepareStart',
        response: '',
        runSchedule: runSchedule,
        timestamp: database.ServerValue.TIMESTAMP
      },
    });
  }
  static registerReadyStateListener(readyStateListener) {
    if (!readyStateListener) {
      return;
    }
    const dbRef = database().ref(prefix + '/command');
    return dbRef.on('value', (snapshot) => {
      if (snapshot.val().response === 'ready') {
        readyStateListener();
      }
    });
  }
  static confirmStart(runSchedule) {
    const dbRef = database().ref(prefix + '/');
    return dbRef.update({
      command: {
        request: 'confirmStart',
        response: '',
        runSchedule: runSchedule,
        timestamp: database.ServerValue.TIMESTAMP
      },
    });
  }
  static unregisterReadyStateListener(readyStateListenerObj) {
    if (readyStateListenerObj) {
      const dbRef = database().ref(prefix + '/command');
      dbRef.off('value', readyStateListenerObj);
    }
  }
  static registerStopStateListener(stopStateListener) {
    if (!stopStateListener) {
      return;
    }
    const dbRef = database().ref(prefix + '/command');
    return dbRef.on('value', (snapshot) => {
      if (snapshot.val().response === 'stopped') {
        stopStateListener();
      }
    });
  }

  static unregisterStopStateListener(stopStateListenerObj) {
    if (stopStateListenerObj) {
      const dbRef = database().ref(prefix + '/command');
      dbRef.off('value', stopStateListenerObj);
    }
  }
  static registerMotorStateListener(motorStateListener) {
    if (!motorStateListener) {
      return;
    }
    const dbRef = database().ref(prefix + '/systemStatus');
    return dbRef.on('value', (snapshot) => {
      if (snapshot.val()) {
        motorStateListener(snapshot.val());
      }
    });
  }
  static unregisterMotorStateListener(motorStateListenerObj) {
    if (motorStateListenerObj) {
      const dbRef = database().ref(prefix + '/systemStatus');
      dbRef.off('value', motorStateListenerObj);
    }
  }

  static stop() {
    const dbRef = database().ref(prefix + '/');
    return dbRef.update({
      command: {
        request: 'stop',
        response: '',
        timestamp: database.ServerValue.TIMESTAMP,
      },
    });
  }
  static updateSystemStatus() {
    const dbRef = database().ref('/');
    return dbRef.update({
      command: {
        request: 'updateSystemStatus',
        response: '',
        timestamp: database.ServerValue.TIMESTAMP,
      },
    });
  }  
  static getSystemStatus() {
    return new Promise((resolve, reject) => {
      const systemRef = database().ref(prefix + '/systemStatus');
      systemRef
        .once('value')
        .then((data) => {
          resolve(data.val());
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
