import auth from '@react-native-firebase/auth';

var verifyOtpObject = null;

function sendOtp(phoneNumber, autoVerifyCallback) {
  return new Promise((resolve, reject) => {
    auth()
      .signInWithPhoneNumber(phoneNumber, true)
      .then(function (result) {
        verifyOtpObject = result;
        resolve();
        const unsubscribeAuthStateListener = auth().onAuthStateChanged(
          (user) => {
            if (user && user.phoneNumber === phoneNumber) {
              //TODO: Convert the firebase user object format to app specific user object format
              autoVerifyCallback(user);
              unsubscribeAuthStateListener();
            }
          },
        );
      })
      .catch(function (error) {
        console.log(error);
        reject(error);
      });
  });
}

function verifyOtp(code) {
  return new Promise((resolve, reject) => {
    if (verifyOtpObject) {
      verifyOtpObject
        .confirm(code)
        .then((user) => {
          //TODO: Convert the firebase user object format to app specific user object format
          resolve(user);
          console.log('User login successful');
        })
        .catch((err) => {
          reject(err);
        });
    } else {
      reject('Otp was not sent');
    }
  });
}

export {sendOtp, verifyOtp};
