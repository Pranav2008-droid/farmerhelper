import auth from '@react-native-firebase/auth';

var verifyOtpObject = null;

function sendOtp(phoneNo) {
  return new Promise((resolve, reject) => {
    auth()
      .signInWithPhoneNumber(phoneNo, true)
      .then(function (result) {
        verifyOtpObject = result;
        resolve();
        // const authState = auth().onAuthStateChanged((data) => {
        // });
      })
      .catch(function (error) {
        console.log(error);
        reject(error);
      });
  });
}

function verifyOtp(code) {
  console.log(
    'InputJson received in phoneauth.js is ' +
      JSON.stringify(verifyOtpObject) +
      'and code received in phoneauth.js is ' +
      code,
  );
  return new Promise((resolve, reject) => {
    if (verifyOtpObject) {
      verifyOtpObject
        .confirm(code)
        .then((user) => {
          resolve(user);
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
