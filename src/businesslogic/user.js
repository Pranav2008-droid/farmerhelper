import {UserDbApi} from '../backend';

var userStatus = null;

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
          userStatus = user;
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  static returnUserDetails() {
    return new Promise((resolve, reject) => {
      UserDbApi.createUserConfig(userStatus)
        .then((userDetails) => {
          resolve(userDetails);
        })
        .catch((err) => {
          alert(err);
          reject(err);
        });
    });
  }
}
