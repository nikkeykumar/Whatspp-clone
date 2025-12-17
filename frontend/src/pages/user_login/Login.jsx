import React, { useState } from "react";
import { set, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaChevronDown,
  FaPlus,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";
import Spinner from "../../../utils/Spinner";
import countries from "../../../utils/countriles";
import { useLoginStor } from "../../../store/useLoginStore";
import { useUserStor } from "../../../store/useUserStore";
import { useThemeStor } from "../../../store/themeStore";
import {
  sendOtp,
  updateProfile,
  verifyOtp,
} from "../../services/user_Services";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

// --- validation schemas ---
const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d*$/, "Phone number must be digits only"),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email"),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    (value) => !!(value.phoneNumber || value.email)
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .required("OTP is required"),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("username is required"),
  agreed: yup.bool().oneOf([true], "you must agree to terms"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const Login = () => {
  const { step, setStep, userPhoneData, setUserPhoneData, resetLoginState } =
    useLoginStor();
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState();
  const navigate = useNavigate();
  const { setUser } = useUserStor();
  const { theme } = useThemeStor();
  const [loading, setLoading] = useState(false);

  // --- forms ---
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginError },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  const {
    register: otpRegister,
    handleSubmit: handleOtpSubmit,
    setValue: setOtpValue,
    formState: { errors: otpError },
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileError },
    watch,
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  // --- country filter ---
  const filterdCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  );

  // --- submit handlers ---
  const onLoginSubmit = async (data) => {
    try {
      setLoading(true);
      if (data.email) {
        const response = await sendOtp(null, null, data.email);
        if (response?.status === "success") {
          toast.success("OTP sent to your email");
          setUserPhoneData({ email: data.email });
          setStep(2);
        }
      } else {
        const response = await sendOtp(
          data.phoneNumber,
          selectedCountry.dialCode
        );
        console.log("sendOtp response:", response);
        if (response?.status === "success") {
          toast.success("OTP sent to your phone");
          setUserPhoneData({
            phoneNumber: data.phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });

          setStep(2);
        }
      }
    } catch (error) {
      console.log(error);
      setError(error?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (data) => {
    try {
      console.log("OTP submit data:", data);
      setLoading(true);
      console.log(userPhoneData);
      if (!userPhoneData) throw new Error("Phone or email data is missing");

      const otpString = data.otp;

      let response;
      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, userPhoneData.email, otpString);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          null,
          otpString
        );
      }

      if (response?.status === "success") {
        toast.success("OTP verified successfully");
         const token = response?.data?.token;
         localStorage.setItem("auth_token",token)
        const user = response?.data?.user;
        if (user?.username && user?.ProfilePicture) {
          setUser(user);
          toast.success("Welcome back to WhatsApp");
          navigate("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      } else {
        setError(response?.message || "OTP verification failed");
      }
    } catch (error) {
      console.log("verifyOtp error:", error);
      setError(error?.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", data.agreed);
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("ProfilePicture", selectedAvatar);
      }
      await updateProfile(formData);
      toast.success("Welcome to WhatsApp");
      navigate("/");
      resetLoginState();
    } catch (error) {
      console.log(error);
      setError(error?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handelfileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  // --- helpers ---
  const handelOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handelBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  // --- progress bar ---
  const ProgressBar = () => (
    <div
      className={`w-full h-2.5 rounded-full mb-6 ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      }`}
    >
      <div
        className="bg-green-500 transition-all duration-500 ease-in-out h-2.5 rounded-full"
        style={{ width: `${(step / 3) * 100}%` }}
      />
    </div>
  );

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        } p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="flex items-center justify-center w-23 h-24 bg-green-400 rounded-full mx-auto mb-6"
        >
          <FaWhatsapp className="w-16 h-16 text-white" />
        </motion.div>

        <h1
          className={`text-3xl font-bold mb-6 text-center ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          WhatsApp Login
        </h1>

        <ProgressBar />
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* --- Step 1: Login --- */}
        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={handleLoginSubmit(onLoginSubmit)}
          >
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Enter your phone number or email to receive an OTP
            </p>

            {/* phone input with country */}
            <div className="relative">
              <div className="flex">
                {/* country dropdown */}
                <div className="relative w-1/3">
                  <button
                    type="button"
                    onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                    className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600"
                        : "text-gray-900 bg-gray-100 border-gray-300"
                    } border rounded-s-lg hover:bg-gray-200`}
                  >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>
                  {showDropdownMenu && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      } border rounded-md shadow-lg max-h-60 overflow-auto`}
                    >
                      <div
                        className={`sticky top-0 p-2 ${
                          theme === "dark" ? "bg-gray-700" : "bg-white"
                        }`}
                      >
                        <input
                          type="text"
                          placeholder="Search Countries..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-3 py-1 border ${
                            theme === "dark"
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300"
                          } rounded-md text-sm focus:outline-none`}
                        />
                      </div>
                      {filterdCountries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowDropdownMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {country.flag}({country.dialCode}) {country.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* phone input */}
                <input
                  type="text"
                  {...loginRegister("phoneNumber")}
                  className={`w-2/3 px-3 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-700"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    loginError.phoneNumber ? "border-red-500" : ""
                  }`}
                  placeholder="Phone Number"
                />
              </div>
              {loginError.phoneNumber && (
                <p className="text-sm text-red-500">
                  {loginError.phoneNumber.message}
                </p>
              )}
            </div>

            {/* divider */}
            <div className="flex items-center my-4">
              <div className="flex-grow bg-gray-300 h-px" />
              <span className="text-sm font-medium text-gray-500 mx-3">or</span>
              <div className="flex-grow bg-gray-300 h-px" />
            </div>

            {/* email input */}
            <div
              className={`flex items-center border rounded-md px-3 py-2 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <FaUser className="mr-2 text-gray-400" />
              <input
                type="email"
                {...loginRegister("email")}
                className={`w-full bg-transparent ${
                  theme === "dark" ? "text-white" : "text-black"
                } focus:outline-none`}
                placeholder="Email (Optional)"
              />
            </div>
            {loginError.email && (
              <p className="text-sm text-red-500">{loginError.email.message}</p>
            )}

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
            >
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}

        {/* --- Step 2: OTP --- */}
        {step === 2 && (
          <form className="space-y-4" onSubmit={handleOtpSubmit(onOtpSubmit)}>
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Please enter the 6-digit OTP sent to{" "}
              {userPhoneData?.email ||
                `${userPhoneData?.phoneSuffix}${userPhoneData?.phoneNumber}`}
            </p>

            <div className="flex justify-between">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handelOtpChange(index, e.target.value)}
                  className={`w-12 h-12 border text-center rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "border-gray-300 text-gray-700"
                  } ${otpError.otp ? "border-red-500" : ""}`}
                />
              ))}
            </div>
            {otpError.otp && (
              <p className="text-sm text-red-500">{otpError.otp.message}</p>
            )}

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
            >
              {loading ? <Spinner /> : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handelBack}
              className={`mt-2 w-full ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-200 text-gray-700"
              } py-2 rounded-md flex items-center justify-center hover:bg-gray-300`}
            >
              <FaArrowLeft className="mr-2" />
              Wrong number? Go back
            </button>
          </form>
        )}

        {step === 3 && (
          <form
            className="space-y-4"
            onSubmit={handleProfileSubmit(onProfileSubmit)}
          >
            <div className="flex flex-col items-center mb-4">
              <div className=" relative h-24 w-24 mb-2">
                <img
                  src={profilePicture || selectedAvatar}
                  alt="profile"
                  className="w-full h-full object-cover rounded-full"
                />
                <label
                  htmlFor="profile-Picture"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 trangsition duration-300"
                >
                  <FaPlus className="w-4 h-4" />
                </label>
                <input
                  type="file"
                  accept="image/*"
                  id="profile-Picture"
                  onChange={handelfileChange}
                  className="hidden"
                />
              </div>
              <p
                className={`text-sm mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-500"
                }`}
              >
                choose an Avatar
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {avatars.map((avatar, index) => (
                  <img
                    src={avatar}
                    alt={`Avatar${index + 1}`}
                    key={index}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 transform ease-in-out hover:scale-110 ${
                      selectedAvatar === avatar ? "ring-4 ring-green-500" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="relative">
              <FaUser
                className={`absolute  left-3 top-1/2  transform -translate-y-1/2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500 "
                }`}
              />
              <input
                type="text"
                {...profileRegister("username")}
                placeholder="Username"
                className={`w-full pl-10 pr-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg`}
              />
              {profileError.username && (
                <p className="text-sm text-red-500 mt-1">
                  {profileError.username.message}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...profileRegister("agreed")}
                className={`rounded ${
                  theme === "dark"
                    ? "text-green-500 bg-gray-700"
                    : "text-green-500"
                } focus:ring-green-500`}
              />
              <label
                htmlFor="terms "
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                I agree to the {""}{" "}
                <a href="#" className="text-red-500 hover:underline">
                  terms and conditions
                </a>
              </label>
            </div>{" "}
            {profileError.agreed && (
              <p className="text-sm text-red-500 mt-1">
                {profileError.agreed.message}
              </p>
            )}
            <button
              type="submit"
              disabled={!watch("agreed") || loading}
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
            >
              {loading ? <Spinner /> : "submit"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
