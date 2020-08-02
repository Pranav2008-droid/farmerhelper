import React, { Component } from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import { themeVariables } from '../themes/ThemeService';
import { strings } from '../i18n/i18n';
import { wp, hp } from '../utils/Dimension';
import PhoneNoWithCountryCode from './components/PhoneNoWithCountryCode';
import HeaderBackground from '../svgs/bg.svg';

const entireScreenWidth = rn.Dimensions.get('window').width;


const styles = rn.StyleSheet.create({
  container: { 
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0072B1'
  },
  headerBackgroundStyle: {
    flex: 0.3
  },
  backIconStyle: {
    width: wp(24),
    height: hp(24),
    marginTop: hp(54),
    left: wp(12),
    fontSize: wp(24),
    color: themeVariables.brandPrimaryInverted1
  },
  content: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  contentStyle: {
    flex: 1,
    borderTopLeftRadius: wp(15),
    borderTopRightRadius: wp(15),
    backgroundColor: themeVariables.brandPrimaryInverted1
  },
  textStyle: {
    marginTop: hp(29),
    left: wp(16),
    fontSize: wp(20),
    fontFamily: themeVariables.font.galanoMedium,
    color: themeVariables.brandPrimaryInverted2,
  },
  labelStyle: {
    marginTop: hp(8),
    left: wp(16),
    fontSize: wp(12),
    fontFamily: themeVariables.font.galanoRegular,
    color: themeVariables.brandPrimaryInverted2
  },
  countryCodeViewStyle: {
    marginTop: hp(29),
    
  },
  PhoneNoCallCodeViewStyle: {
    width: wp(328),
    height: hp(50),
    borderRadius: wp(themeVariables.commonRadius),
    borderWidth: wp(themeVariables.commonBorderWidth),
    borderColor: themeVariables.commmonBorderColor,
    backgroundColor: themeVariables.brandPrimaryInverted1,
    alignContent: 'center',
  },
  callCodeTextStyle: {
    height: hp(50),
    opacity: wp(0.6),
    fontSize: wp(14),
    fontFamily: themeVariables.font.galanoMedium,
    color: themeVariables.brandPrimaryInverted2,
    letterSpacing: wp(2.33),
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  phoneNumberInputStyle: {
    width: wp(156),
    height: hp(50),
    opacity: wp(0.6),
    fontSize: wp(14),
    fontFamily: themeVariables.font.galanoMedium,
    color: themeVariables.brandPrimaryInverted2,
    letterSpacing: wp(2.33),
    textAlign: 'left',
    textAlignVertical: 'center',
  }
});

class PhoneSigninScrn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enableNextButton: false
    };
  }
  renderHeaderBackground() {
    const ImageWidth = 360;
    const ImageHeight = 268;
    const ratio = entireScreenWidth / ImageWidth;
    return (
      <HeaderBackground
        style={{ flex: 0.3 }}
        width={entireScreenWidth}
        height={ratio * ImageHeight}
      />
    );
  }
  renderHeaderContent() {
    return (
      <rn.View style={styles.headerBackgroundStyle}>
        <nb.Icon
          name={themeVariables.icons.arrowBack.name}
          type={themeVariables.icons.arrowBack.type}
          style={styles.backIconStyle}
          onPress={() => { this.onPressBack(); }}
        />
      </rn.View>
    );
  }
  renderContactView() {
    return (
      <rn.View style={styles.countryCodeViewStyle}>
        <PhoneNoWithCountryCode
          phoneNumber={this.state.phoneNo}
          callingCode={this.state.callingCode}
          placeholder={'1234567890'}
          viewStyle={styles.PhoneNoCallCodeViewStyle}
          textStyle={styles.phoneNumberInputStyle}
          callCodeTextStyle={styles.callCodeTextStyle}
          onChangePhoneNo={this.onChangePhoneNo.bind(this)}
        />
      </rn.View>
    );
  }
  renderButtonView() {
    return (
      <nb.Fab
        disabled={!this.state.enableNextButton}
        style={{ backgroundColor: this.state.enableNextButton ? 
          themeVariables.brandBrightBlue : 
          themeVariables.brandGray }}
        position="bottomRight"
        onPress={() => { this.onPressNextButton(); }}
      >
        <nb.Icon 
          name={themeVariables.icons.arrowRight.name}
          type={themeVariables.icons.arrowRight.type}
        />
      </nb.Fab>
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
    return (
      <rn.View style={styles.content}>
        {this.renderHeaderContent()}
        {this.renderPageContent()}
      </rn.View>
    );
  }
  render() {
    return (
      <DismissKeyboard>
        <nb.Container style={styles.container}>
          {this.renderHeaderBackground()}
          {this.renderContent()}
        </nb.Container>
      </DismissKeyboard>
    );
  }
}
export default PhoneSigninScrn;
