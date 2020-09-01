import {sendOtp, verifyOtp} from '../auth';
import firestore from '@react-native-firebase/firestore';

export default class User {
  static signInByPhone(phoneNumber, autoVerifyCallback) {
    return sendOtp(phoneNumber, autoVerifyCallback);
  }
  static verifyCode(code) {
    return verifyOtp(code);
  }
  static createUserConfig() {
    const users = firestore()
      .collection('users')
      .doc('testUser1')
      .set({phoneNo: 123456789});
    return new Promise((resolve, reject) => {
      resolve('From user.js at firestore');
    });
  }
}
