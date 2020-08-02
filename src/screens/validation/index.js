export function validatePhone(cca2, countryCallingCode, phoneNumber) {
  const fullPhoneNumber = `${countryCallingCode}${phoneNumber}`;
  // TODO: Check for proper phone number validation
  switch (cca2) {
    case 'IN':
      return (
        countryCallingCode.length === 2 && fullPhoneNumber.trim().length === 12
      );
    default:
      return countryCallingCode.length > 0 && fullPhoneNumber.trim().length > 6;
  }
}