import React, {Component} from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import CountryPicker, {
  getAllCountries,
} from 'react-native-country-picker-modal';
import * as themes from '../../themes';
import {strings} from '../../i18n';
import * as Validator from '../validation';
import {hp, wp} from '../utils/dimension';

class PhoneInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.props,
      // Default country and calling code
      showCountrySelection: false,
      countryName: 'IN',
      callingCode: '91',
    };
  }
  onCountyCodePickerChange(country) {
    let callingCode = '';
    let countryName = '';
    if (country.callingCode) {
      callingCode = country.callingCode[0];
      countryName = country.cca2;
    }
    this.setState({callingCode, countryName});
  }
  onChangePhoneNumber(phoneNumber) {
    const self = this;
    self.props.onChangePhoneNo(
      self.state.callingCode,
      phoneNumber,
      self.isValidPhoneNumber(self.state.callingCode, phoneNumber),
    );
  }
  isValidPhoneNumber(callingCode, phoneNumber) {
    let isValid = false;
    const {countryName} = this.state;
    if (
      callingCode &&
      callingCode.length > 0 &&
      phoneNumber &&
      phoneNumber.length > 0
    ) {
      isValid =
        countryName !== '0' &&
        Validator.validatePhone(countryName, callingCode, phoneNumber);
    }
    return isValid;
  }
  renderCountryCodePicker() {
    if (this.state.countryName === '0') {
      return <rn.View />;
    }
    console.log('her' + this.state.showCountrySelection);
    return (
      <CountryPicker
        countryCode={this.state.countryName}
        withFilter
        withFlag
        withModal
        withCountryNameButton={false}
        withAlphaFilter
        withCallingCode
        withEmoji
        onSelect={this.onCountyCodePickerChange.bind(this)}
        filterPlaceholder={strings('search')}
        disabled={this.props.disableCountryCode}
        transparent
        filterProps={{
          autoFocus: false,
          placeholder: strings('search'),
        }}
        visible={this.state.showCountrySelection}
        onClose={() => {
          this.setState({
            showCountrySelection: false,
          });
        }}
        styles={{
          countryName: {
            color: themes.colors.primaryFg2,
            fontSize: 16,
            fontWeight: 'normal',
          },
          letterText: {
            fontSize: 16,
          },
        }}
      />
    );
  }

  renderPhoneNoValidationIcon() {
    const phoneNumber = this.props.phoneNumber;
    const callingCode = this.state.callingCode;
    let phoneNoValidationIcon = <rn.View style={styles.validationView} />;
    if (
      callingCode &&
      callingCode.length > 0 &&
      phoneNumber &&
      phoneNumber.length > 0
    ) {
      const iconResult = this.isValidPhoneNumber(callingCode, phoneNumber)
        ? [
            themes.colors.validationIconSuccess,
            themes.icons.checkMarkCircle.name,
            themes.icons.checkMarkCircle.type,
          ]
        : [
            themes.colors.validationIconError,
            themes.icons.closeCircle.name,
            themes.icons.checkMarkCircle.type,
          ];
      phoneNoValidationIcon = (
        <nb.Icon
          style={[styles.validationView, {color: iconResult[0]}]}
          name={iconResult[1]}
          type={iconResult[2]}
        />
      );
    }
    return phoneNoValidationIcon;
  }

  renderPhoneNumberView() {
    const self = this;
    return (
      <rn.View style={[styles.viewStyle, self.props.viewStyle]}>
        <rn.TouchableOpacity
          activeOpacity={.5}
          onPress={() => {
            this.setState({
              showCountrySelection: true,
            });
          }}
          style={styles.firstCol}>
          {self.renderCountryCodePicker()}
          <rn.View style={styles.downArrow} />
        </rn.TouchableOpacity>
        <rn.View style={styles.SecondCol}>
          <rn.TextInput
            style={[styles.textArea, self.props.textStyle]}
            disabled={self.props.disableCountryCode}
            autoCorrect={false}
            keyboardType="numeric"
            maxLength={13}
            value={self.props.phoneNumber}
            placeholder={self.props.placeholder}
            onChangeText={self.onChangePhoneNumber.bind(this)}
          />
          {self.renderPhoneNoValidationIcon()}
          {this.props.children}
        </rn.View>
      </rn.View>
    );
  }

  render() {
    return <rn.View>{this.renderPhoneNumberView()}</rn.View>;
  }
}

export default PhoneInput;

const styles = rn.StyleSheet.create({
  viewStyle: {
    width: '100%',
    height: hp(50),
    flexDirection: 'row',
    alignSelf: 'center',
    borderColor: themes.colors.borderColor1,
    borderWidth: wp(themes.styles.common.borderWidth1),
    borderRadius: wp(themes.styles.common.borderRadius2),
  },
  firstCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: wp(3),
    borderColor: themes.colors.borderColor1,
    borderRightWidth: wp(themes.styles.common.borderWidth1),
    borderRightColor: themes.colors.borderColor1,
    flexDirection: 'row',
  },
  textStyle: {
    fontFamily: themes.fonts.medium1,
    padding: 0,
    fontSize: wp(14),
    textAlign: 'center',
    textAlignVertical: 'center',
    color: themes.colors.primaryFg2,
  },
  textArea: {
    flex: 3,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: wp(14),
    color: themes.colors.primaryFg2,
  },
  SecondCol: {
    flex: 4,
    alignItems: 'center',
    flexDirection: 'row',
    paddingLeft: wp(15),
  },
  validationView: {
    flex: 0.7,
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: wp(20),
  },
  downArrow: {
    width: 0,
    height: 0,
    borderTopColor: 'black',
    borderColor: themes.colors.primaryFg1,
    marginTop: wp(6),
    borderWidth: wp(6),
  },
});
