import React from 'react';
import * as rn from 'react-native';
//import Toast from 'react-native-simple-toast';
import {Slider} from '@miblanchard/react-native-slider';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
import * as themes from '../../themes';
import {strings} from '../../i18n';
import {wp, hp} from '../utils/dimension';
import {Motor} from '../../businesslogic';
import {ProgressDialog} from '../components';
import {diff} from 'react-native-reanimated';

var Types = require('../../common/types');
var Status = Types.Status;
const minRunSchedule = 10;
const defaultRunSchedule = 30;
const maxRunSchedule = 120;
export default class MeasureScrn extends React.Component {
  constructor() {
    super();
    this.state = {
      phase1: 240,
      phase2: 210,
      phase3: 250,
      systemStatus: {
        motorState: {
          durationInThisState: 0,
          runSchedule: 0,
          runTime: 0,
          state: Status.NA
        },
        powerState: Status.NA,
      },
      showProgressModal: false,
      showInitialProgressModal: true,
      progressMessage: strings('0x00000017'),
      lastUpdatedTime: null,
      runSchedule: defaultRunSchedule,
      runScheduleModified: false
    };
    this.globalSize = 1.8;
    this.maxVoltage = 440;
    this.listener = null;
    this.systemStatusUpdater = null;
    this.lastUpdatedTimeRefresher = null;
    this.refreshLastUpdatedTime = this.refreshLastUpdatedTime.bind(this);
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.runSchedulerIntervals = [];
    for (var schedule = 0; schedule <= maxRunSchedule; schedule += 30) {
      this.runSchedulerIntervals.push(schedule);
    }
    if (this.runSchedulerIntervals[this.runSchedulerIntervals.length - 1] !== maxRunSchedule) {
      this.runSchedulerIntervals.push(maxRunSchedule);
    }
  }
  componentDidMount() {
    const self = this;
    this.listener = Motor.registerMotorStateListener((data) => {
      self.setSystemStatus(data);
    });
    this.updateSystemStatus();
    this.startLastUpdatedTimeRefresher();
    this.startSystemStatusUpdate();
    rn.AppState.addEventListener('change', this.handleAppStateChange);
  }
  getRunSchedule(status) {
    var runSchedule = defaultRunSchedule;
    /*
      * Note:- If the calculated run schedule is less than defaultRunSchedule, set it to
      * defaultRunSchedule.
      */
    var runScheduleFromServer = status.motorState.runSchedule - status.motorState.runTime;
    if ( runScheduleFromServer > defaultRunSchedule) {
      runSchedule = status.motorState.runSchedule - status.motorState.runTime;
    }
    return runSchedule;
  }
  setSystemStatus(status) {
    var runSchedule = this.state.runSchedule;
    if (this.state.systemStatus.motorState.state === Status.ON ||  !this.state.runScheduleModified) {
      /* If the user has not changed the run schedule, set the schedule received from the
      * server.
      */ 
      runSchedule = this.getRunSchedule(status);
    }
    this.setState(
      {
        systemStatus: status,
        runSchedule,
        showInitialProgressModal: false,
      },
      () => {
        this.stopLastUpdatedTimeRefresher();
        this.refreshLastUpdatedTime();
        this.startLastUpdatedTimeRefresher();
      },
    );
  }
  startSystemStatusUpdate() {

    // The controller updates the status periodically. so there is 
    // no need to pull the status.
    return;

    if (!this.systemStatusUpdater) {
      this.systemStatusUpdater = setInterval(() => {
        Motor.updateSystemStatus()
          .then(() => {
            console.log('Motor status update requested successfully');
          })
          .catch((e) => {
            console.log('Error while updating motor status');
            console.log(e);
          });
      }, 300000);
    } else {
      console.log('System status updater is already running');
    }
  }
  updateSystemStatus() {
    const self = this;
    Motor.getSystemStatus()
    .then((data) => {
      if (data != null) {
        self.setSystemStatus(data);
        console.log('Motor status update requested successfully');
      } else {
        this.setState(
          {
            showInitialProgressModal: false,
          });
        console.log('System status returned is null');
      }
    })
    .catch((e) => {
      this.setState(
        {
          showInitialProgressModal: false,
        });
      console.log('Error while updating motor status');
      console.log(e);
    });
  }
  stopSystemStatusUpdate() {
    if (this.systemStatusUpdater) {
      clearTimeout(this.systemStatusUpdater);
      this.systemStatusUpdater = null;
    }
  }
  refreshLastUpdatedTime() {
    var lastUpdatedTime = strings('0x00000013');
    if (this.state.systemStatus && this.state.systemStatus.timestamp) {
      const localTime = Date.now();
      var difference = Math.floor(
        (localTime - this.state.systemStatus.timestamp) / 1000,
      );
      if (difference < 0) {
        /* This scenario should never happen. But we observed that the localtime is
        lower than this.state.systemStatus.timestamp even though we are taking 
        localtime after this.state.systemStatus.timestamp.
        So the difference becomes negative.

        As a workaround, lets treat the negative value as zero. */
        //TODO: Fix this problem
        difference = 0;
      }
      if (difference >= 0) {
        if (difference < 60) {
          lastUpdatedTime = strings('0x00000014');
        } else if (difference < 3600) {
          lastUpdatedTime =
            Math.round(difference / 60) * 1 + ' ' + strings('0x00000015');
        } else if (difference < 86400) {
          lastUpdatedTime =
            Math.round(difference / 3600) * 1 + ' ' + strings('0x00000016');
        }
      }
      //TODO: Add last update for morethan a day. Currently its updated only upto 24 hours. If last
      //update time is > 24, currently we show "Not Available"
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
    this.stopSystemStatusUpdate();
    rn.AppState.removeEventListener('change', this.handleAppStateChange);
  }
  handleAppStateChange(nextAppState) {
    if (nextAppState === 'active') {
      console.log('App has come to the foreground!');
      this.updateSystemStatus();
      this.startSystemStatusUpdate();
    } else {
      this.stopSystemStatusUpdate();
      console.log('App is not in foreground');
    }
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
      (this.state.systemStatus.motorState.state === Status.OFF) &&
      (this.state.systemStatus.powerState === Status.ON)
    ) {
      if (this.state.runSchedule > 0 && this.state.runSchedule < minRunSchedule) {
        alert(strings('Minimum schedule is %{minSchedule}',
        {minSchedule: this.getDurationDisplayText(minRunSchedule)}))
        return;
      }
      this.stopSystemStatusUpdate();
      this.setState({
        showProgressModal: true,
        progressMessage: strings('0x0000000F'),
      });
      Motor.turnOn(this.state.runSchedule)
        .then(() => {
          this.startSystemStatusUpdate();
          this.setState(
            {
              showProgressModal: false,
              progressMessage: null,
              systemStatus: {
                ...this.state.systemStatus,
                motorState: 
                {
                  ...this.state.systemStatus.motorState,
                  state: Status.ON,
                  runTime: 0,
                  runSchedule: this.state.runSchedule,
                  runScheduleModified: false
                }
              },
            },
            () => {
              //alert(strings('0x00000011'));
            },
          );
        })
        .catch((err) => {
          console.log(err);
          this.startSystemStatusUpdate();
          this.setState(
            {
              systemStatus: {
                ...this.state.systemStatus,
                motorState: 
                {
                  ...this.state.systemStatus.motorState,
                  state: Status.OFF
                }
              },
              showProgressModal: false,
              progressMessage: null,
            },
            () => {
              alert(strings('0x00000010'));
            },
          );
        });
    } else if (this.state.systemStatus.motorState.state === Status.ON) {
      alert(strings('motorAlreadyOn'));
    } else if (this.state.systemStatus.powerState === Status.OFF) {
      alert(strings('0x00000019'));
    }
  }
  onPressOffButton() {
    if (this.state.systemStatus.motorState.state === Status.ON) {
      this.stopSystemStatusUpdate();
      this.setState({
        showProgressModal: true,
        progressMessage: strings('0x0000001B'),
      });
      Motor.turnOff()
        .then(() => {
          var runSchedule = this.getRunSchedule(this.state.systemStatus);
          this.startSystemStatusUpdate();

          this.setState(
            {
              systemStatus: {
                ...this.state.systemStatus,
                motorState: 
                {
                  ...this.state.systemStatus.motorState,
                  state: Status.OFF
                },
                runSchedule
              },
              runScheduleModified: false,
              showProgressModal: false,
              progressMessage: null,
            },
            () => {
              //alert(strings('0x0000001A'))
            },
          );
        })
        .catch((err) => {
          this.startSystemStatusUpdate();
          console.log(err);
          this.setState(
            {
              systemStatus: {
                ...this.state.systemStatus,
                motorState: 
                {
                  ...this.state.systemStatus.motorState,
                  state: Status.ON
                }
              },
              showProgressModal: false,
              progressMessage: null,
            },
            () => {
              alert(strings('0x0000001C'));
            },
          );
        });
    } else {
      alert(strings('motorAlreadyOff'));
    }
  }
  getDurationDisplayText(duration) {
    let hours = parseInt(duration / 60);
    let minutes = duration - (hours * 60);
    let displayText = "";
    if (hours > 0) {
      displayText = strings('%{hours} hours', {hours}) + ' ';
    }
    if (minutes > 0) {
      displayText += strings('%{minutes} minutes', {minutes});
    }
    return displayText;
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
  renderMotorStatusView() {
    var motorState = this.state.systemStatus.motorState.state;
    return <rn.View style={styles.motorStatusView}>
      <rn.View style={styles.motorStatus}>
        <rn.Text style={styles.motorStatusText}>
          {(motorState === Status.ON || motorState === Status.OFF) ? 
            strings('motorStatus1') : strings('motorStatus2')}
        </rn.Text>
        <rn.Text
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            ...styles.motorStatusText,
            paddingLeft: wp(2),
            color:
            motorState === Status.ON
              ? themes.colors.appGreen
              : themes.colors.appRed,
          }}>
          {this.getStateString(motorState)}
        </rn.Text>
      </rn.View>
    </rn.View>
  }
  renderMotorControlView() {
    return (
    <rn.View style={styles.motorControlView}>
      <rn.TouchableOpacity
        activeOpacity={0}
        style={styles.onButton}
        onPress={this.onPressOnButton.bind(this)}>
        <rn.Text style={styles.onButtonText}>
          {strings('onLabel')}
        </rn.Text>
      </rn.TouchableOpacity>
      <rn.TouchableOpacity
        activeOpacity={0}
        style={styles.offButton}
        onPress={this.onPressOffButton.bind(this)}>
        <rn.Text style={styles.offButtonText}>
          {strings('offLabel')}
        </rn.Text>
      </rn.TouchableOpacity>
    </rn.View>
    );
  }
  renderSliderTrackView(index) {
    return <rn.TouchableOpacity
    activeOpacity={1}
    style={styles.sliderTrackText}
    onPress={() => {
      this.setState({
        runSchedule: this.runSchedulerIntervals[index],
        runScheduleModified: true
      })
    }}>
      <rn.Text>
        {(this.runSchedulerIntervals[index]/30)*0.5}
      </rn.Text>
    </rn.TouchableOpacity>

  }
  renderScheduleSliderView() {
    var scheduleText;
    var scheduleTime = this.state.runSchedule;
    if (scheduleTime > 0) {
      scheduleText = strings("Runs for %{scheduleTime}", 
              {scheduleTime: this.getDurationDisplayText(scheduleTime)});
    } else {
      scheduleText = strings("Runs untill stopped");
    }
    return <rn.View style={styles.sliderContainer}>
        <Slider
            value={this.state.runSchedule}
            onValueChange={value => {
              this.setState({
                runSchedule: value[0],
                runScheduleModified: true
              });
            }}
            step={1}
            minimumValue={0}
            maximumValue={maxRunSchedule}
            minimumTrackTintColor={themes.colors.appGreen}
            thumbStyle={styles.sliderThumb}
            trackStyle={styles.sliderTrack}
            trackClickable
            trackMarks={this.runSchedulerIntervals}
            renderTrackMarkComponent={this.renderSliderTrackView.bind(this)}
        />
        <rn.Text style={{margin:0, paddingTop: hp(40), paddingLeft: 0}}>
          {scheduleText}
        </rn.Text>
      </rn.View>          
  }
  renderRunningTime(runingTimeTxt) {
    return <rn.View style={styles.scheduleInfoTextView}>
      <rn.Text>
        {strings('Running for')}
      </rn.Text>
      <rn.Text style={{color: themes.colors.appGreen}}>
        {runingTimeTxt}
      </rn.Text>
    </rn.View>
  }
  renderScheduleInfo(scheduleTimeTxt, remainingRuntimeTxt) {
    return <rn.View style={styles.scheduleInfoTextView}>
      <rn.Text>
        {strings('Scheduled for %{scheduleTime}', {scheduleTime: scheduleTimeTxt})}
      </rn.Text>
      <rn.Text style={{color: themes.colors.appGreen}}>
        {strings('%{balanceSchedule} remaining', {balanceSchedule: remainingRuntimeTxt})}
      </rn.Text>
    </rn.View>
  }
  /* 
   * This is shown when the motor state is on and schedule is set
   * This shows the actual scheuldle and the remining runtime from the
   * schedule.
   */
  renderRunInfo() {
    var {runSchedule, runTime} = this.state.systemStatus.motorState;
    var remainingRuntimeTxt = this.getDurationDisplayText(runSchedule - runTime);
    var scheduleTimeTxt = this.getDurationDisplayText(runSchedule);
    var runingTimeTxt = this.getDurationDisplayText(runTime);
    if (runSchedule === 0 && runTime === 0) {
      runingTimeTxt = strings('Started just now');
    }
    return <rn.View style={styles.scheduleInfoContainer}>
        {runSchedule > 0 && this.renderScheduleInfo(scheduleTimeTxt, remainingRuntimeTxt)}
        {runSchedule === 0 && this.renderRunningTime(runingTimeTxt)}
      </rn.View>      
  }
  renderRunSchedulerView() {
    return (
      <rn.View style={styles.runSchedulerView}>
        {this.state.systemStatus.motorState.state  === Status.OFF && this.renderScheduleSliderView()}
        {this.state.systemStatus.motorState.state  === Status.ON && this.renderRunInfo()}
      </rn.View>
    );
  }
  renderBottomView() {
    return <rn.View style={styles.bottomView}>
    {this.renderMotorStatusView()}
    {this.renderMotorControlView()}
    {this.renderRunSchedulerView()}
  </rn.View>

  }
  renderLastUpdatedView() {
    return <rn.View style={styles.lastUpdatedView}>
      <rn.Text style={styles.motorUpdatedText}>
        {strings('0x00000012') + this.state.lastUpdatedTime}
      </rn.Text>
  </rn.View>    
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
                    ? themes.colors.appGreen
                    : themes.colors.appRed,
              }}>
              {
                (this.state.systemStatus.powerState === Status.ON) && strings("present")
              }
              {
                (this.state.systemStatus.powerState === Status.OFF) && strings("notPresent")
              }
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
        {this.renderBottomView()}
        {this.renderLastUpdatedView()}
        <ProgressDialog
          isVisible={
            this.state.showProgressModal || this.state.showInitialProgressModal
          }
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
  motorStatus: {
    marginTop: hp(29),
    flexDirection: 'row',
  },
  motorStatusText: {
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
    fontSize: wp(20),
    padding: wp(3)
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
    flex: 1.3,
//    backgroundColor: 'black'
  },
  motorStatusView: {
    flex: 0.7,
//    backgroundColor: 'red',
    width: '100%',
    alignItems: 'center',
    paddingTop: hp(10)
  },
  motorControlView: {
    flex: 1,
//    backgroundColor: 'yellow',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
  },
  runSchedulerView: {
    flex: 1,
//    backgroundColor: 'green',
    width: '100%',

  },
  onButton: {
    backgroundColor: themes.colors.motorStatusOnButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    width: 100,
    aspectRatio: 1,
  },
  onButtonText: {
    fontSize: wp(17),
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
    fontSize: wp(17),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg1,
  },
  sliderContainer: {
    flex: 1.2,
    paddingLeft: 40,
    paddingRight: 40,
    justifyContent: 'center',
    width: '100%',
  },
  scheduleInfoContainer: {
    flex: 1,
    paddingLeft: 50,
    paddingRight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  sliderTrackText: {
    fontSize: wp(11),
    paddingTop: hp(65),
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,
  },
  sliderThumb: {
      backgroundColor: '#363131',
      borderRadius: 15,
      height: 40,
      width: 15,
  },
  sliderTrack: {
      borderRadius: 10,
      height: 18,
  },  
  scheduleInfoTextView: {
    borderColor: 'gray',
    width: '100%',
    backgroundColor: '#d6d6d6',
    borderWidth: 1,
    borderRadius: 30,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  motorUpdatedText: {
    fontSize: wp(11),
    paddingLeft: 15,
    paddingBottom: 15,
    fontFamily: themes.fonts.medium1,
    color: themes.colors.primaryFg2,

  },  
  lastUpdatedView: {
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
    flex: 0.1,
//    backgroundColor: 'black'
  },    
});
