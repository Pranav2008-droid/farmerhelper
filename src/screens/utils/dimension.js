import {
  widthPercentageToDP as responsiveWidth,
  heightPercentageToDP as responsiveHeight,
} from 'react-native-responsive-screen';

//reference screen width,height for responsive width,height calculation
const baseScreenHeight = 764;
const baseScreenWidth = 360;

export const wp = (dimension) =>
  responsiveWidth(`${(dimension / baseScreenWidth) * 100}%`);

export const hp = (dimension) =>
  responsiveHeight(`${(dimension / baseScreenHeight) * 100}%`);
