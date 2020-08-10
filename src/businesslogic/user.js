import {UserDbApi} from '../backend';

export default class User {
  static signInByPhone(phoneNumber, autoVerifyCallback) {
    return new Promise((resolve, reject) => {
      UserDbApi.signInByPhone(phoneNumber, autoVerifyCallback)
        .then((user) => {
          //TODO: Create app specific user object and return
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  static verifyCode(code) {
    return new Promise((resolve, reject) => {
      UserDbApi.verifyCode(code)
        .then((user) => {
          //TODO: Create app specific user object and return
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
