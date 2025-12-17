import Twilio from "twilio";

const accountSid = process.env.TWILLO_ACCOUNT_SID;
const authToken = process.env.TWILLO_AUTH_TOKEN;
const serviceSid = process.env.TWILLO_SERVICE_SID;

const client = Twilio(accountSid, authToken);
// OTP sending
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      throw new Error("phoneNumber is required");
    }
    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });
    console.log("This is my OTP response", response);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send OTP");
  }
};
// OTP verification

const verifyOtpToPhone = async (phoneNumber, otp) => {
  try {
    console.log("  phone number:", phoneNumber);
    console.log("This is OTP:", otp);
    const response = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });
    console.log("This is my OTP response", response);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("OTP verification failed");
  }
};

export { sendOtpToPhoneNumber, verifyOtpToPhone };
