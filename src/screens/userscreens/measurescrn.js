import React from 'react';
import * as rn from 'react-native';
import * as themes from '../../themes';
import {strings} from '../../i18n';
import {wp, hp} from '../utils/dimension';
import {AnimatedCircularProgress} from 'react-native-circular-progress';

export default class MeasureScrn extends React.Component {
  constructor() {
    super();
    //TODO: Read the live status from firebase
    this.state = {
      phase1: 240,
      phase2: 210,
      phase3: 250,
      motorStatus: 'On',
    };
    this.globalSize = 1.8;
    this.maxVoltage = 440;
  }
  onPressOnButton() {
    if (this.state.motorStatus === 'Off') {
      //TODO: Send on operation to motor through firebase
      this.setState({
        motorStatus: 'On',
      });
    }
  }
  onPressOffButton() {
    if (this.state.motorStatus === 'On') {
      //TODO: Send off operation to motor through firebase
      this.setState({
        motorStatus: 'Off',
      });
    }
  }
  renderMeter(value, color, backgroundColor, text) {
    return (
      <rn.View style={styles.circularProgressContainer}>
        <AnimatedCircularProgress
          animate={500}
          size={wp(50 * this.globalSize)}
          width={wp(7.5 * this.globalSize)}
          backgroundWidth={wp(8.625 * this.globalSize)}
          lineCap={'round'}
          arcSweepAngle={240}
          rotation={240}
          fill={value}
          tintColor={color}
          duration={1000}
          backgroundColor={backgroundColor}
          style={styles.circularProgress}>
          {(phase1) => (
            <rn.Text style={styles.centerText}>{text + 'v'}</rn.Text>
          )}
        </AnimatedCircularProgress>
      </rn.View>
    );
  }
  render() {
    return (
      <rn.View style={styles.container}>
        <rn.View style={styles.topView}>
          <rn.View style={styles.voltageTextView}>
            <rn.Text style={styles.textStyle}>
              {strings('voltageLevel')}
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
          <rn.Text style={styles.motorStatusText}>
            {strings('motorStatus') + this.state.motorStatus}
          </rn.Text>
          <rn.View style={styles.motorStatusButtonView}>
            <rn.TouchableOpacity
              activeOpacity={1}
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                ...styles.onButton,
                backgroundColor:
                  this.state.motorStatus === 'On' ? 'green' : 'gray',
              }}
              onPress={this.onPressOnButton.bind(this)}>
              <rn.Text // eslint-disable-next-line react-native/no-inline-styles
                style={{
                  ...styles.onButtonText,
                  color: this.state.motorStatus === 'On' ? 'white' : 'darkgray',
                }}>
                On
              </rn.Text>
            </rn.TouchableOpacity>
            <rn.TouchableOpacity
              activeOpacity={1}
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                ...styles.offButton,
                backgroundColor:
                  this.state.motorStatus === 'Off' ? 'red' : 'gray',
              }}
              onPress={this.onPressOffButton.bind(this)}>
              <rn.Text // eslint-disable-next-line react-native/no-inline-styles
                style={{
                  ...styles.offButtonText,
                  color:
                    this.state.motorStatus === 'Off' ? 'white' : 'darkgray',
                }}>
                Off
              </rn.Text>
            </rn.TouchableOpacity>
          </rn.View>
        </rn.View>
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
    shadowColor: 'white',
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
  bottomView: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
    borderRadius: 10,
    shadowColor: 'white',
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
  onButton: {
    backgroundColor: 'green',
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
    backgroundColor: 'green',
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
