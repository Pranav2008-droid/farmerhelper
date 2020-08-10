import React, {Component} from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import Spinner from 'react-native-spinkit';
import Toast from 'react-native-simple-toast';
import * as themes from '../themes';
import {strings} from '../i18n';
import {wp, hp} from './utils/dimension';
import HeaderBackground from '../../assets/svgs/bg.svg';
import {User} from '../businesslogic';
import OtpInput from './components/otpinput';

const entireScreenWidth = rn.Dimensions.get('window').width;

class OtpScrn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enableNextButton: true,
      otp: '',
      showProgressDialog: true,
      phoneNumber: props.route.params.phoneNumber,
    };
  }
  componentDidMount() {
    User.signInByPhone(
      this.state.phoneNumber,
      this.autoVerifyCallback.bind(this),
    )
      .then(() => {
        this.setState({
          showProgressDialog: false,
        });
      })
      .catch((err) => {
        //TODO: Handle individual errors
        Toast.show(strings('errUnableToSendOtp'), Toast.LONG);
        console.log(err);
        this.setState(
          {
            showProgressDialog: false,
          },
          () => {
            this.props.navigation.goBack();
          },
        );
      });
  }
  onPressNextButton = () => {
    this.setState({
      showProgressDialog: true,
    });
    User.verifyCode(this.state.otp)
      .then((user) => {
        console.log(user);
        this.navigateToHomeScreen();
      })
      .catch((err) => {
        console.log(err);
        alert(err);
        Toast.show(strings('errUnableToVerifyOtp'), Toast.LONG);
        this.setState({
          showProgressDialog: false,
        });
      });
  };
  autoVerifyCallback(user) {
    console.log(user);
    this.navigateToHomeScreen();
  }
  navigateToHomeScreen() {
    this.setState(
      {
        showProgressDialog: false,
      },
      () => {
        this.props.navigation.reset({
          index: 0,
          routes: [{name: 'UserScreens'}],
        });
      },
    );
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

  renderButtonView() {
    return (
      <rn.TouchableOpacity
        disabled={this.state.otp.length !== 6}
        onPress={() => {
          this.onPressNextButton();
        }}
        style={{
          backgroundColor:
            this.state.otp.length === 6
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
        <OtpInput
          onOtpChanged={(otp) => {
            this.setState({
              otp: otp,
            });
          }}
        />
      </rn.View>
    );
  }
  renderContent() {
    return <rn.View style={styles.content}>{this.renderPageContent()}</rn.View>;
  }
  renderProgressModal() {
    return (
      <rn.Modal visible={this.state.showProgressDialog} transparent>
        <rn.View style={styles.progressModalContainer}>
          <Spinner type="Circle" size={50} color={themes.colors.primary} />
        </rn.View>
      </rn.Modal>
    );
  }
  render() {
    return (
      <rn.View style={styles.container}>
        {this.renderHeaderBackground()}
        {this.renderContent()}
        {this.renderButtonView()}
        {this.renderProgressModal()}
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
  progressModalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
