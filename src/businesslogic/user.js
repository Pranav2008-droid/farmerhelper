import {UserDbApi} from '../backend';

export default class User {
  static signInByPhone(phoneNo) {
    return new Promise((resolve, reject) => {
      UserDbApi.signInByPhone(phoneNo)
        .then((user) => {
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
