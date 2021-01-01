import React from 'react';
import * as rn from 'react-native';
import Toast from 'react-native-simple-toast';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
import * as themes from '../../themes';
import {strings} from '../../i18n';
import {wp, hp} from '../utils/dimension';
import {Motor} from '../../businesslogic';
import {ProgressDialog} from '../components';

var Types = require('../../common/types');
var Status = Types.Status;

export default class MeasureScrn extends React.Component {
  constructor() {
    super();
    this.state = {
      phase1: 240,
      phase2: 210,
      phase3: 250,
      systemStatus: {
        motorState: Status.NA,
        powerState: Status.NA,
      },
      showProgressModal: true,
      progressMessage: strings('0x00000017'),
      lastUpdatedTime: null,
    };
    this.globalSize = 1.8;
    this.maxVoltage = 440;
    this.listener = null;
    this.lastUpdatedTimeRefresher = null;
    this.refreshLastUpdatedTime = this.refreshLastUpdatedTime.bind(this);
  }
  componentDidMount() {
    this.listener = Motor.registerMotorStateListener((data) => {
      this.setState(
        {
          systemStatus: data,
          showProgressModal: false,
        },
        () => {
          this.refreshLastUpdatedTime();
        },
      );
    });
    this.startLastUpdatedTimeRefresher();
  }
  refreshLastUpdatedTime() {
    var lastUpdatedTime = strings('0x00000013');
    if (this.state.systemStatus && this.state.systemStatus.timestamp) {
      const localTime = Date.now();
      var difference = Math.floor(
        (localTime - this.state.systemStatus.timestamp) / 1000,
      );
      if (difference >= 0) {
        if (difference < 60) {
          lastUpdatedTime = difference * 1 + ' ' + strings('0x00000014');
        } else if (difference < 3600) {
          lastUpdatedTime =
            Math.round(difference / 60) * 1 + ' ' + strings('0x00000015');
        } else if (difference < 86400) {
          lastUpdatedTime =
            Math.round(difference / 3600) * 1 + ' ' + strings('0x00000016');
        }
      }
    }
    this.setState({
      lastUpdatedTime: lastUpdatedTime,
    });
  }
  startLastUpdatedTimeRefresher() {
    this.refreshLastUpdatedTime();
    this.lastUpdatedTimeRefresher = setInterval(
      this.refreshLastUpdatedTime.bind(this),
      10000,
    );
  }
  stopLastUpdatedTimeRefresher() {
    if (this.lastUpdatedTimeRefresher) {
      clearTimeout(this.lastUpdatedTimeRefresher);
    }
  }
  componentWillUnmount() {
    Motor.unregisterMotorStateListener(this.listener);
    this.stopLastUpdatedTimeRefresher();
  }
  getStateString(state) {
    var stringState = strings('0x00000013');

    switch (state) {
      case Status.ON:
        stringState = strings('on');
        break;
      case Status.OFF:
        stringState = strings('off');
        break;
      default:
        stringState = strings('0x00000013');
    }
    return stringState;
  }
  onPressOnButton() {
    if (
      // eslint-disable-next-line no-bitwise
      (this.state.systemStatus.motorState === Status.OFF) &
      (this.state.systemStatus.powerState === Status.ON)
    ) {
      this.setState({
        showProgressModal: true,
        progressMessage: strings('0x0000000F'),
      });
      Motor.turnOn()
        .then(() => {
          this.setState(
            {
              showProgressModal: false,
              progressMessage: null,
            },
            () => {
              Toast.show(strings('0x00000011'), Toast.SHORT, Toast.CENTER);
            },
          );
        })
        .catch((err) => {
          console.log(err);
          this.setState(
            {
              systemStatus: {
                ...this.state.systemStatus,
                motorState: Status.OFF,
              },
              showProgressModal: false,
              progressMessage: null,
            },
            () => {
              Toast.show(strings('0x00000010'), Toast.SHORT, Toast.CENTER);
            },
          );
        });
    } else if (this.state.systemStatus.motorState === Status.ON) {
      Toast.show(strings('motorAlreadyOn'), Toast.SHORT, Toast.CENTER);
    } else if (this.state.systemStatus.powerState === Status.OFF) {
      Toast.show(strings('0x00000019'), Toast.SHORT, Toast.CENTER);
    }
  }
  onPressOffButton() {
    if (this.state.systemStatus.motorState === Status.ON) {
      this.setState({
        showProgressModal: true,
      });
      Motor.turnOff()
        .then(() => {
          this.setState(
            {
              showProgressModal: false,
              progressMessage: null,
            },
            () => {
              Toast.show(strings('0x00000011'), Toast.SHORT, Toast.CENTER);
            },
          );
        })
        .catch((err) => {
          console.log(err);
          this.setState(
            {
              systemStatus: {
                ...this.state.systemStatus,
                motorState: Status.ON,
              },
              showProgressModal: false,
              progressMessage: null,
            },
            () => {
              Toast.show(strings('0x00000010'), Toast.SHORT, Toast.CENTER);
            },
          );
        });
    } else {
      Toast.show(strings('motorAlreadyOff'), Toast.SHORT, Toast.CENTER);
    }
  }
  renderMeter(value, color, backgroundColor, text) {
    // return (
    //   <rn.View style={styles.circularProgressContainer}>
    //     <AnimatedCircularProgress
    //       animate={500}
    //       size={wp(50 * this.globalSize)}
    //       width={wp(7.5 * this.globalSize)}
    //       backgroundWidth={wp(8.625 * this.globalSize)}
    //       lineCap={'round'}
    //       arcSweepAngle={240}
    //       rotation={240}
    //       fill={value}
    //       tintColor={color}
    //       duration={1000}
    //       backgroundColor={backgroundColor}
    //       style={styles.circularProgress}>
    //       {(phase1) => (
    //         <rn.Text style={styles.centerText}>{text + 'v'}</rn.Text>
    //       )}
    //     </AnimatedCircularProgress>
    //   </rn.View>
    // );
  }
  render() {
    return (
      <rn.View style={styles.container}>
        <rn.View style={styles.topView}>
          <rn.View style={styles.voltageTextView}>
            <rn.Text style={styles.textStyle}>{strings('0x00000018')}</rn.Text>
            <rn.Text
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                ...styles.textStyle,
                color:
                  this.state.systemStatus.powerState === Status.ON
                    ? 'green'
                    : 'red',
              }}>
              {this.state.systemStatus.powerState}
            </rn.Text>
          </rn.View>
          <rn.View style={styles.voltageMeterView}>
            {this.renderMeter(
              this.state.phase1 / (this.maxVoltage / 100),
              themes.colors.phase1Color,
              themes.colors.phase1BackgroundColor,
              this.state.phase1,
            )}
            {this.renderMeter(
              this.state.phase2 / (this.maxVoltage / 100),
              themes.colors.phase2Color,
              themes.colors.phase2BackgroundColor,
              this.state.phase2,
            )}
            {this.renderMeter(
              this.state.phase3 / (this.maxVoltage / 100),
              themes.colors.phase3Color,
              themes.colors.phase3BackgroundColor,
              this.state.phase3,
            )}
          </rn.View>
        </rn.View>

        <rn.View style={styles.bottomView}>
          <rn.View style={styles.motorTextView}>
            <rn.Text style={styles.motorStatusText}>
              {strings('motorStatus') +
                this.getStateString(this.state.systemStatus.motorState)}
            </rn.Text>
            <rn.Text style={styles.motorUpdatedText}>
              {strings('0x00000012') + this.state.lastUpdatedTime}
            </rn.Text>
          </rn.View>
          <rn.View style={styles.motorStatusButtonView}>
            <rn.TouchableOpacity
              activeOpacity={0}
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                ...styles.onButton,
                backgroundColor: themes.colors.motorStatusOnbutton,
              }}
              onPress={this.onPressOnButton.bind(this)}>
              <rn.Text style={styles.onButtonText}>
                {strings('onLabel')}
              </rn.Text>
            </rn.TouchableOpacity>
            <rn.TouchableOpacity
              activeOpacity={0}
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                ...styles.offButton,
                backgroundColor: themes.colors.motorStatusOffButton,
              }}
              onPress={this.onPressOffButton.bind(this)}>
              <rn.Text // eslint-disable-next-line react-native/no-inline-styles
                style={{
                  ...styles.offButtonText,
                  color: themes.colors.primaryFg1,
                }}>
                {strings('offLabel')}
              </rn.Text>
            </rn.TouchableOpacity>
          </rn.View>
        </rn.View>
        <ProgressDialog
          isVisible={this.state.showProgressModal}
          message={this.state.progressMessage}
        />
      </rn.View>
    );
  }
}

const styles = rn.StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1,
  },
  voltageMeterView: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    flex: 1,
  },
  topView: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    borderRadius: 10,
    shadowColor: themes.colors.primaryFg1,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10,
    marginBottom: wp(10),
    flex: 0.9,
  },
  circularProgress: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  centerText: {
    color: themes.colors.Fg1,
  },
  circularProgressContainer: {
    padding: '3.333%',
  },
  textStyle: {
    marginTop: hp(29),
    fontSize: wp(25),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
  },
  voltageTextView: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  motorStatusText: {
    marginTop: hp(29),
    fontSize: wp(20),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
  },
  motorUpdatedText: {
    fontSize: wp(12),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
  },
  bottomView: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
    borderRadius: 10,
    shadowColor: themes.colors.primaryFg1,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10,
    marginBottom: wp(10),
    flex: 0.9,
  },
  motorTextView: {
    alignItems: 'center',
  },
  onButton: {
    backgroundColor: themes.colors.motorStatusOnbutton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    width: 100,
    aspectRatio: 1,
  },
  onButtonText: {
    fontSize: wp(20),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg1,
  },
  offButton: {
    backgroundColor: themes.colors.motorStatusOffButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    width: 100,
    aspectRatio: 1,
  },
  offButtonText: {
    fontSize: wp(20),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg1,
  },
  motorStatusButtonView: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
});
