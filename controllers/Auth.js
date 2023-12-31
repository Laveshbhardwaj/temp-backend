const userModel = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const OTPgenerator = require("otp-generator");
const OTP = require("../models/OTP");
const MailSender = require("../utils/MailSender");
const signUp = async (req, res) => {
  //Existing User Check
  //Hashed Password
  //User Creation
  //Token Generate
  require("dotenv").config();
  const { username, email, password, otp, accountType } = req.body;
  try {
    const existingUser = await userModel.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const recentOtp = await OTP.find({ email })
      .sort({ createdAt: -1 })
      .limit(1);
    // console.log("Recent otp", recentOtp);
    console.log(recentOtp);

    if (recentOtp.length === 0) {
      return res.status(400).json({
        success: false,
        message: "OTP Not Found",
      });
    }
    if (recentOtp[0].otp == otp) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await userModel.create({
        email: email,
        password: hashedPassword,
        username: username,
        accountType: accountType,
      });
      return res.status(200).json({
        sucess: "true",
        message: "new user created suceessfully",
      });
    }
    return res.status(400).json({
      sucess: false,
      message: "Invalid otp entered",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something Went Wrong" });
  }
};

const logIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("this is login");
    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const matchPassword = await bcrypt.compare(password, existingUser.password);

    if (!matchPassword) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    const payload = {
      ac: existingUser.accountType,
      email: existingUser.email,
      id: existingUser._id,
    };
    console.log(payload);
    const token = jwt.sign(payload, process.env.SECRET_KEY);
    // adding token to the cookuie
    existingUser.token = token;
    existingUser.password = undefined;
    // create a cookie
    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };
    return res.cookie("token", token, options).status(200).json({
      success: true,
      token,
      existingUser,
      message: " login succed",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something Went Wrong" });
  }
};

const sendOtp = async (req, res) => {
  const { email } = req.body;
  const userDetails = await userModel.findOne({ email });
  // console.log(userDetails)
  // if(userDetails)
  // {
  //    return res.status(403).json({
  //       success:false ,
  //       message:"User already exit"
  //    })
  // }
  // otp generated
  const otp = OTPgenerator.generate(6, {
    specialChars: false,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
  });
  // to send the otp save the otp in db
  const otpDetails = await OTP.create({
    email,
    otp,
  });
   const template=`<!DOCTYPE html>
   <html lang="en">
   
   <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>OTP</title>
   </head>
   
   <body>
       <div
           style="font-family: Helvetica,Arial,sans-serif;min-width:320px;max-width:100%;overflow:auto;line-height:2;background-color:#FEF0DC">
           <div style="margin:50px auto;max-width:90%;padding:20px 0">
               <div style="border-bottom:1px solid #eee">
                   <a href="www.ikonikbez.com"
                       style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">IKONIKBEZ</a>
               </div>
               <p style="font-size:1.1em">Hi,</p>
               <p>Thank you for choosing Ikonikbez . Use the following OTP to complete your Sign Up procedures. OTP is
                   valid for 5 minutes</p>
               <h2
                   style="background: #6D282C;margin: 0 auto;width:fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
                   <strong>${otpDetails.otp}</strong>
               </h2>
               <p style="font-size:0.9em;">Regards,<br /><a href="www.ikonikbez.com">IKONIKBEZ</a>
               </p>
               <hr style="border:none;border-top:1px solid #eee" />
               <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                   <p>Ikonikbez Pvt, Ltd.</p>
                   <p>India</p>
               </div>
           </div>
       </div>
   </body>
   
   </html>`
  await MailSender(otpDetails.email, "Witronix powered", template);
  return res.status(200).json({
    success: true,
    message: "Otp sent succesfullty",
  });
};
const loggedInUser = async (req, res) => {
  const { email, token } = req.user;
  const existingUser = await userModel.findOne({ email: email });
  existingUser.password = undefined;
  return res.json({
    user: existingUser,
  });
};

const resetPassword = async (req, res) => {
  try {
    const { otp, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Both password are different",
      });
    }
    const recentOtp = await OTP.find({ email })
      .sort({ createdAt: -1 })
      .limit(1);
    console.log(otp);
    console.log("otp is", recentOtp[0].otp);
    if (otp != recentOtp[0].otp) {
      return res.status(400).json({
        success: false,
        message: "otp not ,match",
      });
    }
    console.log("here");
    const hashedPsw = await bcrypt.hash(password, 10);
    const NewUser = await userModel.findOneAndUpdate(
      { email: email },
      {
        password: hashedPsw,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Password Updated Successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Error While Reseting psw",
    });
  }
};
module.exports = { signUp, logIn, sendOtp, loggedInUser, resetPassword };
