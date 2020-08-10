import {sendOtp, verifyOtp} from '../auth';
export default class User {
  static signInByPhone(phoneNumber, autoVerifyCallback) {
    return sendOtp(phoneNumber, autoVerifyCallback);
  }
  static verifyCode(code){
    return verifyOtp(code);
  }
}
