import {sendOtp} from '../auth';
export default class User {
  static signInByPhone(phoneNo) {
    return sendOtp(phoneNo);
  }
}
