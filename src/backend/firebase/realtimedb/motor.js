import database from '@react-native-firebase/database';

export default class MotorApi {
  static prepareStart() {
    const dbRef = database().ref('/');
    return dbRef.update({
      command: {
        request: 'prepareStart',
        response: '',
        timestamp: database.ServerValue.TIMESTAMP,
      },
    });
  }
  static registerReadyStateListener(readyStateListener) {
    if (!readyStateListener) {
      return;
    }
    const dbRef = database().ref('/command');
    return dbRef.on('value', (snapshot) => {
      if (snapshot.val().response === 'ready') {
        readyStateListener();
      }
    });
  }
  static confirmStart() {
    const dbRef = database().ref('/');
    return dbRef.update({
      command: {
        request: 'confirmStart',
        response: '',
        timestamp: database.ServerValue.TIMESTAMP,
      },
    });
  }
  static unregisterReadyStateListener(readyStateListenerObj) {
    if (readyStateListenerObj) {
      const dbRef = database().ref('/command');
      dbRef.off('value', readyStateListenerObj);
    }
  }
  static registerStopStateListener(stopStateListener) {
    if (!stopStateListener) {
      return;
    }
    const dbRef = database().ref('/command');
    return dbRef.on('value', (snapshot) => {
      if (snapshot.val().response === 'stopped') {
        stopStateListener();
      }
    });
  }

  static unregisterStopStateListener(stopStateListenerObj) {
    if (stopStateListenerObj) {
      const dbRef = database().ref('/command');
      dbRef.off('value', stopStateListenerObj);
    }
  }
  static registerMotorStateListener(motorStateListener) {
    if (!motorStateListener) {
      return;
    }
    const dbRef = database().ref('/systemStatus');
    return dbRef.on('value', (snapshot) => {
      if (snapshot.val()) {
        motorStateListener(snapshot.val());
      }
    });
  }
  static unregisterMotorStateListener(motorStateListenerObj) {
    if (motorStateListenerObj) {
      const dbRef = database().ref('/systemStatus');
      dbRef.off('value', motorStateListenerObj);
    }
  }

  static stop() {
    const dbRef = database().ref('/');
    return dbRef.update({
      command: {
        request: 'stop',
        response: '',
        timestamp: database.ServerValue.TIMESTAMP,
      },
    });
  }
  static getRealtimeData() {
    return new Promise((resolve, reject) => {
      const systemRef = database().ref('/systemStatus');
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
