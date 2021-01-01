import React, {Component} from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import * as themes from '../themes';
import {strings} from '../i18n';
import {wp, hp} from './utils/dimension';
import Spinner from 'react-native-spinkit';
import Toast from 'react-native-simple-toast';
import {PhoneInput} from './components';
import HeaderBackground from '../../assets/svgs/bg.svg';
import {User} from '../businesslogic';
const entireScreenWidth = rn.Dimensions.get('window').width;

class LoginScrn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enableNextButton: false,
    };
  }
  onPressNextButton = () => {
    var phoneNumber = '+' + this.state.callingCode + this.state.phoneNumber;
    this.props.navigation.navigate('OtpScrn', {phoneNumber: phoneNumber});
  };

  onChangePhoneNumber(callingCode, phoneNumber, isValid) {
    this.setState({
      enableNextButton: isValid,
      phoneNumber: phoneNumber,
      callingCode,
    });
  }

  renderHeaderBackground() {
    const ImageWidth = 360;
    const ImageHeight = 268;
    const ratio = entireScreenWidth / ImageWidth;
    return (
      <HeaderBackground
        style={styles.headerBackgroundStyle}
        width={entireScreenWidth}
        height={ratio * ImageHeight}
      />
    );
  }
  renderContactView() {
    return (
      <rn.View style={styles.countryCodeViewStyle}>
        <PhoneInput
          phoneNumber={this.state.phoneNumber}
          callingCode={this.state.callingCode}
          placeholder={strings('mobileNo')}
          viewStyle={styles.PhoneNumberCallCodeViewStyle}
          textStyle={styles.phoneNumberInputStyle}
          callCodeTextStyle={styles.callCodeTextStyle}
          onChangePhoneNumber={this.onChangePhoneNumber.bind(this)}
        />
      </rn.View>
    );
  }
  renderButtonView() {
    return (
      <rn.TouchableOpacity
        disabled={!this.state.enableNextButton}
        onPress={() => {
          this.onPressNextButton();
        }}
        style={{
          backgroundColor: this.state.enableNextButton
            ? themes.colors.primaryBrightBlue
            : themes.colors.primaryDisabled,
          ...styles.nextButtonStyle,
        }}>
        <nb.Icon
          name={themes.icons.arrowRight.name}
          type={themes.icons.arrowRight.type}
          style={{
            color: this.state.enableNextButton
              ? themes.colors.primaryFg1
              : themes.colors.primaryDisabledLight,
          }}
        />
      </rn.TouchableOpacity>
    );
  }
  renderPageContent() {
    return (
      <rn.View style={styles.contentStyle}>
        <rn.Text style={styles.textStyle}>
          {strings('whatIsYourNumber')}
        </rn.Text>
        <rn.Text style={styles.labelStyle}>
          {strings('weWillTextACodeToVerifyYourPhone')}
        </rn.Text>
        {this.renderContactView()}
        {this.renderButtonView()}
      </rn.View>
    );
  }
  renderContent() {
    return <rn.View style={styles.content}>{this.renderPageContent()}</rn.View>;
  }
  render() {
    return (
      <rn.View style={styles.container}>
        {this.renderHeaderBackground()}
        {this.renderContent()}
      </rn.View>
    );
  }
}
export default LoginScrn;

const styles = rn.StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0072B1',
  },
  headerBackgroundStyle: {
    flex: 0.3,
  },
  backIconStyle: {
    width: wp(24),
    height: hp(24),
    marginTop: hp(54),
    left: wp(12),
    fontSize: wp(24),
    color: themes.colors.primaryFg1,
  },
  content: {
    flex: 1,
    position: 'absolute',
    top: hp(170),
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentStyle: {
    flex: 1,
    borderTopLeftRadius: wp(15),
    borderTopRightRadius: wp(15),
    backgroundColor: themes.colors.primaryFg1,
  },
  textStyle: {
    marginTop: hp(29),
    left: wp(16),
    fontSize: wp(20),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
  },
  labelStyle: {
    marginTop: hp(8),
    left: wp(16),
    fontSize: wp(12),
    fontFamily: themes.fonts.regular1,
    color: themes.colors.primaryFg2,
  },
  countryCodeViewStyle: {
    marginTop: hp(29),
  },
  PhoneNumberCallCodeViewStyle: {
    width: wp(328),
    height: hp(50),
    borderRadius: wp(themes.styles.common.borderRadius1),
    borderWidth: wp(themes.styles.common.borderWidth1),
    borderColor: themes.colors.borderColor1,
    backgroundColor: themes.colors.primaryFg1,
    alignContent: 'center',
  },
  callCodeTextStyle: {
    height: hp(50),
    opacity: wp(0.6),
    fontSize: wp(14),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
    letterSpacing: wp(2.33),
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  phoneNumberInputStyle: {
    width: wp(156),
    height: hp(50),
    opacity: wp(0.6),
    fontSize: wp(18),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
    letterSpacing: wp(2.33),
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  nextButtonStyle: {
    borderRadius: wp(70),
    height: hp(70),
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: hp(30),
    right: wp(30),
  },
  progressModalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});
