import React, {Component} from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import * as themes from '../themes';
import {strings} from '../i18n';
import {wp, hp} from './utils/dimension';
import HeaderBackground from '../../assets/svgs/bg.svg';
import {User} from '../businesslogic';

const entireScreenWidth = rn.Dimensions.get('window').width;

class OtpScrn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enableNextButton: true,
      inputText: '',
    };
  }
  onPressNextButton = () => {
    console.log('going to the next screen');
    this.props.navigation.navigate('UserScreens');
  };

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
  renderTextView() {
    return (
      <rn.View
        style={{
          paddingLeft: wp(20),
          paddingRight: wp(20),
          flexDirection: 'row',
        }}>
        <rn.TextInput
          style={styles.otpinput}
          ref="input_1"
          autoCorrect={false}
          keyboardType="numeric"
          maxLength={1}
          onChangeText={(text) => {
            this.setState({inputText: text});
            if (text) {
              this.refs.input_2.focus();
            }
          }}
        />
        <rn.TextInput
          style={styles.otpinput}
          ref="input_2"
          autoCorrect={false}
          keyboardType="numeric"
          maxLength={1}
          onChangeText={(text) => {
            this.setState({inputText: text});
            if (text) {
              this.refs.input_3.focus();
            }
          }}
        />
        <rn.TextInput
          style={styles.otpinput}
          ref="input_3"
          autoCorrect={false}
          keyboardType="numeric"
          maxLength={1}
          onChangeText={(text) => {
            this.setState({inputText: text});
            if (text) {
              this.refs.input_4.focus();
            }
          }}

        />
        <rn.TextInput
          style={styles.otpinput}
          ref="input_4"
          autoCorrect={false}
          keyboardType="numeric"
          maxLength={1}
          onChangeText={(text) => {
            this.setState({inputText: text});
            if (text) {
              this.refs.input_5.focus();
            }
          }}

        />
        <rn.TextInput
          style={styles.otpinput}
          ref="input_5"
          autoCorrect={false}
          keyboardType="numeric"
          maxLength={1}
          onChangeText={(text) => {
            this.setState({inputText: text});
            if (text) {
              this.refs.input_6.focus();
            }
          }}
        />
        <rn.TextInput
          style={styles.otpinput}
          ref="input_6"
          autoCorrect={false}
          keyboardType="numeric"
          maxLength={1}
          onChangeText={(text) => {
            this.setState({inputText: text});
          }}
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
        <rn.Text style={styles.textStyle}>{strings('entertheotp')}</rn.Text>
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
        {this.renderTextView()}
        {this.renderButtonView()}
      </rn.View>
    );
  }
}
export default OtpScrn;

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
  otpinput: {
    borderWidth: wp(0),
    borderColor: themes.colors.borderColor1,
    borderBottomWidth: wp(themes.styles.common.borderWidth1),
    width: wp(25),
    marginLeft: wp(25),
    height: hp(50),
    fontSize: wp(18),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
    letterSpacing: wp(2.33),
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  headerBackgroundStyle: {
    flex: 0.3,
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
});
