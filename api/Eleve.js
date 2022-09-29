const express = require("express");
const router = express.Router();

// mongodb Eleve model
const Eleve = require("./../models/Eleve");

// mongodb Eleve verification model
const EleveVerification = require("./../models/EleveVerification");

// mongodb Eleve verification model
const ElevePasswordReset = require("./../models/ElevePasswordReset");

//email handler
const nodemailer = require("nodemailer");

//unique string
const { v4: uuidv4 } = require("uuid");

//env variables
require("dotenv").config();

//Password handler
const bcrypt = require("bcrypt");

//path for static verified page
const path = require("path");
const { deleteImageFromS3 } = require("../s3");
const { encrypt } = require("../cryptoFunctions");

//nodemailer stuff
let transporter = nodemailer.createTransport({
  service: "hotmail",
  secure: false, // use SSL
  port: 25, // port for secure SMTP
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

//testing success
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready for messages");
    console.log(success);
  }
});

//update student data
router.post("/edit", (req, res) => {
  console.log("A request has been made on /edit a student api...");
  console.log(req.body);

  let {
    eleveId,
    newFirstname,
    newLastname,
    newEmail,
    newPassword,
    college,
    classe,
    newPhoto,
    newBirthday,
  } = req.body;

  let passwordToSave = newPassword ? encrypt(newPassword) : null;

  let imageNameInS3;
  if (newPhoto && newPhoto != "/images/blank.png") {
    imageNameInS3 = newPhoto.substring(newPhoto.lastIndexOf("/") + 1);
    console.log("imageNameInS3");
    console.log(imageNameInS3);
  }

  Eleve.find({ _id: eleveId })
    .then((result) => {
      console.log("eleve....");
      console.log(result);
      let oldPictureToDelete;
      if (result[0].photo && result[0].photo != "/images/blank.png") {
        oldPictureToDelete = result[0].photo.substring(
          result[0].photo.lastIndexOf("/") + 1
        );
      }
      if (result.length > 0) {
        //student record exists so we proceed

        if (
          oldPictureToDelete &&
          oldPictureToDelete != imageNameInS3 &&
          oldPictureToDelete != "/images/blank.png"
        ) {
          //first we remove old picture from S3
          console.log("deleting picture from S3...");
          deleteImageFromS3(oldPictureToDelete);
          console.log(
            `image ${imageNameInS3} has been deleted from the bucket`
          );
        }
        Eleve.updateOne(
          { _id: eleveId }, //filter
          {
            firstname: newFirstname,
            lastname: newLastname,
            email: newEmail,
            password: passwordToSave,
            college: college,
            classe: classe.name,
            photo: newPhoto,
            dateOfBirth: newBirthday,
          }
        )
          .then(() => {
            res.json({
              status: "SUCCESS",
              message: "student data has been updated successfully",
            });
          })
          .catch((err) => {
            console.log("l'erreur:");
            console.log(err);
            res.json({
              status: "FAILED",
              message: "An error occured while updating student data",
              error: err,
            });
          });
      } else {
        //student record doesn't exist
        res.json({
          status: "FAILED",
          message: "student with given id not found",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Checking for student record failed.",
      });
    });
});

//update student marks
router.post("/updateMark", (req, res) => {
  console.log("A request has been made on /updateMark for students api...");
  console.log(req.body);
  let {
    eleveId,
    newParticipation,
    newBonus,
    newAvertissement,
    newPosition,
    classe,
    college,
    dateOfBirth,
    discipline,
    markUpdateTime,
    nbSeances,
    isNewSeance,
  } = req.body;

  let marksToUpdate = { $set: {} };

  if (typeof nbSeances === "number" && !Number.isNaN(nbSeances)) {
    // set the lastUpdatedSeance value to the currentSeance : 
    // marksToUpdate.$set[`lastUpdatedSeance`] = nbSeances;

    if (typeof newParticipation === "number" && !Number.isNaN(newParticipation)) {
      marksToUpdate.$set[`participation.$.notes.${nbSeances - 1}`] = newParticipation;

    // set the lastUpdatedSeance value to the currentSeance : 
      marksToUpdate.$set[`participation.$.lastUpdatedSeance`] = nbSeances;

      if (markUpdateTime) {
        marksToUpdate.$set[`participation.$.lastUpdateTime`] = new Date(
          markUpdateTime
        );
      }
    }
    if (typeof newBonus === "number" && !Number.isNaN(newBonus)) {
      marksToUpdate.$set[`bonus.$.notes.${nbSeances - 1}`] = newBonus;

    // set the lastUpdatedSeance value to the currentSeance : 
      marksToUpdate.$set[`bonus.$.lastUpdatedSeance`] = nbSeances;

      if (markUpdateTime) {
        marksToUpdate.$set[`bonus.$.lastUpdateTime`] = new Date(markUpdateTime);
      }
    }
    if (typeof newAvertissement === "number" && !Number.isNaN(newAvertissement)) {
      marksToUpdate.$set[`avertissement.$.notes.${nbSeances - 1}`] =
        newAvertissement;

    // set the lastUpdatedSeance value to the currentSeance : 
      marksToUpdate.$set[`avertissement.$.lastUpdatedSeance`] = nbSeances;
        
      if (markUpdateTime) {
        marksToUpdate.$set[`avertissement.$.lastUpdateTime`] = new Date(
          markUpdateTime
        );
      }
    }
  }
  if (typeof newPosition === "number" && !Number.isNaN(newPosition)) {
    console.log("new position n'est pas nul!");
    // marksToUpdate.$set[`position`] = newPosition; //correcting my mistake: 1 position per discipline
    marksToUpdate.$set[`positions.$.position`] = newPosition;
  }

  console.log("marksToUpdate!!!!!");
  console.log(marksToUpdate);

  Eleve.find({ _id: eleveId })
    .then((result) => {
      console.log("eleve....");
      console.log(result);
      if (result.length > 0) {
        //student record exists so we proceed
        Eleve.updateOne(
          { _id: eleveId, "participation.matière": discipline }, //filter. participation.matiere || bonus.matière || avertissement.matière can all work
          marksToUpdate
        )
          .then(() => {
            res.json({
              status: "SUCCESS",
              message: "student data has been updated successfully",
            });
          })
          .catch((err) => {
            res.json({
              status: "FAILED",
              message: "An error occured while updating student data",
              error: err,
            });
          });
      } else {
        //student record doesn't exist which means that teacher
        // is switching a empty student place
        // Try to create Eleve

        const newEleve = new Eleve({
          _id: eleveId,
          firstname: "Empty Student Firstname",
          lastname: "Empty student Lastname",
          verified: true,
          admin: false,
          avertissement: 0,
          bonus: 0,
          participation: 0,
          photo: "/images/blank.png",
          position: newPosition,
          classe,
          college,
          dateOfBirth,
          email: null,
          password: null,
          empty: true,
        });
        newEleve
          .save()
          .then((result) => {
            //Eleve was added successfully
            console.log("l'eleve a été ajouté avec succès:");
            console.log(result);
            res.json({
              status: "SUCCESS",
              data: "The student was added successfully",
            });
          })
          .catch((err) => {
            res.json({
              status: "FAILED",
              message: "An error occured while adding new empty Eleve!",
            });
          });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Checking for student record failed.",
      });
    });
});

//delete student from DB
router.post("/deleteStudent", (req, res) => {
  console.log("A request has been made on /deleteStudent api...");
  console.log(req.body);
  let { eleveId, imageName } = req.body;
  console.log("dans delete....");
  console.log("req.params");
  console.log(req.params);
  Eleve.find({ _id: eleveId })
    .then((result) => {
      if (result.length > 0) {
        console.log("result");
        console.log(result);
        //student record exists so we proceed to delete it
        Eleve.updateOne(
          { _id: eleveId },
          {
            empty: true,
            firstname: `emptyStudentFirstname${result[0].position}`,
            lastname: `emptyStudentLastname${result[0].position}`,
            email: null,
            password: null,
            photo: "/images/blank.png",
            participation: 0,
            avertissement: 0,
            bonus: 0,
          }
        )
          .then(() => {
            if (imageName != "null") {
              console.log("on supprime dans s3!!");
              //delete the image from the S3 bucket
              deleteImageFromS3(imageName);
            }
            res.json({
              status: "SUCCESS",
              message: "Student data has been deleted successfully",
            });
          })
          .catch((err) => {
            res.json({
              status: "FAILED",
              message: "An error occured while deleting student data",
              error: err,
            });
          });
      } else {
        //Student record doesn't exist
        res.json({
          status: "FAILED",
          message: "Student with given id not found",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Checking for student record failed.",
      });
    });
});

//Signup
router.post("/signup", (req, res) => {
  console.log("A request has been made on /signup api...");
  let { name, email, password, dateOfBirth } = req.body;
  name = name.trim();
  email = email.trim();
  password = password.trim();
  dateOfBirth = dateOfBirth.trim();

  if (name == "" || email == "" || password == "" || dateOfBirth == "") {
    res.json({
      status: "FAILED",
      message: "Empty input fields!",
    });
  } else if (!/^[a-zA-Z ]*$/.test(name)) {
    res.json({
      status: "FAILED",
      message: "Invalid name entered",
    });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    res.json({
      status: "FAILED",
      message: "Invalid email entered",
    });
  } else if (!new Date(dateOfBirth).getTime()) {
    res.json({
      status: "FAILED",
      message: "Invalid date of birth entered",
    });
  } else if (password.length < 8) {
    res.json({
      status: "FAILED",
      message: "Password is too short",
    });
  } else {
    // Checking if Eleve already exists
    Eleve.find({ email })
      .then((result) => {
        if (result.length) {
          // A Eleve already exists
          res.json({
            status: "FAILED",
            message: "Eleve with the provided email already exists",
          });
        } else {
          // Try to create Eleve

          //password handling
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashedPassword) => {
              const newEleve = new Eleve({
                name,
                email,
                password: hashedPassword,
                dateOfBirth,
                verified: false,
              });
              newEleve
                .save()
                .then((result) => {
                  //handle account verification
                  sendVerificationEmail(result, res);
                })
                .catch((err) => {
                  res.json({
                    status: "FAILED",
                    message: "An error occured while saving Eleve account!",
                  });
                });
            })
            .catch((err) => {
              res.json({
                status: "FAILED",
                message: "An error occured while hashing password!",
              });
            });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: "FAILED",
          message: "An error occured while checking for existing Eleve!",
        });
      });
  }
});

//send verification
const sendVerificationEmail = ({ _id, email }, res) => {
  //url to be used in the email
  // const currentUrl = "http://localhost:3001/";
  const currentUrl = "https://hands-up-preprod.herokuapp.com/";

  const uniqueString = uuidv4() + _id;

  //mail options
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Verify your adress to complete the signup and login into your account</p>.
    <p>This link <b> expires in 6 hours</b>.</p><p>Press <a href=${
      currentUrl + "user/verify/" + _id + "/" + uniqueString
    }> 
    here</a> to proceed.</p>`,
  };

  //hash the uniqueString
  const saltRounds = 10;
  bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) => {
      //set values in EleveVerification collection
      const newVerification = new EleveVerification({
        eleveId: _id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 21600000,
      });
      newVerification
        .save()
        .then(() => {
          transporter
            .sendMail(mailOptions)
            .then(() => {
              //email sent and verification record saved
              res.json({
                status: "PENDING",
                message: "Verification email sent",
              });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Verification email failed",
              });
            });
        })
        .catch((error) => {
          res.json({
            status: "FAILED",
            message: "Couldn't save verification email data!",
          });
        });
    })

    .catch(() => {
      res.json({
        status: "FAILED",
        message: "An error occured while hashing email data!",
      });
    });
};

//verify email
router.get("/verify/:eleveId/:uniqueString", (req, res) => {
  console.log("A request has been made on /verify/:eleveId/:uniqueString api...");
  let { eleveId, uniqueString } = req.params;

  EleveVerification.find({ eleveId })
    .then((result) => {
      if (result.length > 0) {
        //Eleve verification record exists so we proceed

        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;

        //checking for expired unique string
        if (expiresAt < Date.now()) {
          //record has expired so we delete it
          EleveVerification.deleteOne({ eleveId })
            .then((result) => {
              Eleve.deleteOne({ _id: eleveId })
                .then(() => {
                  let message = "Link has expired. Please sign up again";
                  res.redirect(`/eleve/verified/error=true&message=${message}`);
                })
                .catch((error) => {
                  let message =
                    "Clearing Eleve with expired unique string failed";
                  res.redirect(`/eleve/verified/error=true&message=${message}`);
                });
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occured while clearing expired Eleve verification record";
              res.redirect(`/eleve/verified/error=true&message=${message}`);
            });
        } else {
          //valid record exists so we validate the Eleve string
          //First compare the hashed unique string

          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                //strings match

                Eleve.updateOne({ _id: eleveId }, { verified: true })
                  .then(() => {
                    EleveVerification.deleteOne({ eleveId })
                      .then(() => {
                        res.sendFile(
                          path.join(__dirname, "./../views/verified.html")
                        );
                      })
                      .catch((error) => {
                        console.log(error);
                        let message =
                          "An error occured while finalizing successful verification.";
                        res.redirect(
                          `/eleve/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((error) => {
                    let message =
                      "An error occured while updating Eleve record to show verified.";
                    res.redirect(
                      `/eleve/verified/error=true&message=${message}`
                    );
                  });
              } else {
                //existing record but incorrect verification details passed.
                let message =
                  "Invalid verification details passed. Check your inbox";
                res.redirect(`/eleve/verified/error=true&message=${message}`);
              }
            })
            .catch((error) => {
              let message = "An error occured while comparing unique strings";
              res.redirect(`/eleve/verified/error=true&message=${message}`);
            });
        }
      } else {
        //Eleve verification record doesn't exist
        let message =
          "Account record doesn't exist or has been verified already. Please sign up or log in";
        res.redirect(`/eleve/verified/error=true&message=${message}`);
      }
    })
    .catch((error) => {
      console.log(error);
      let message =
        "An error occured while checking for existing Eleve verification record";
      res.redirect(`/eleve/verified/error=true&message=${message}`);
    });
});

//Verified page route
router.get("/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "./../views/verified.html"));
});

//Signin
router.post("/signin", (req, res) => {
  console.log("A request has been made on /signin api...");
  let { email, password } = req.body;
  email = email.trim();
  password = password.trim();

  if (email == "" || password == "") {
    res.json({
      status: "FAILED",
      message: "Empty credentials supplied",
    });
  } else {
    //Check if Eleve exist
    Eleve.find({ email })
      .then((data) => {
        if (data.length) {
          //Eleve exists

          //check if Eleve is verified

          if (!data[0].verified) {
            res.json({
              status: "FAILED",
              message: "Email hasn't been verified yet. Check your inbox",
            });
          } else {
            const hashedPassword = data[0].password;
            bcrypt
              .compare(password, hashedPassword)
              .then((result) => {
                if (result) {
                  //Password match
                  res.json({
                    status: "SUCCESS",
                    message: "Signin successful",
                    data: data,
                  });
                } else {
                  res.json({
                    status: "FAILED",
                    message: "Invalid password entered!",
                  });
                }
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message: "An error occured while comparing passwords",
                });
              });
          }
        } else {
          res.json({
            status: "FAILED",
            message: "Invalid credentials entered!",
          });
        }
      })
      .catch((err) => {
        res.json({
          status: "FAILED",
          message: "An error occured while checking for existing Eleve",
        });
      });
  }
});

//Password reset stuff
router.post("/requestPasswordReset", (req, res) => {
  console.log("A request has been made on /requestPasswordReset api...");

  const { email, redirectUrl } = req.body;

  //check if email exists
  Eleve.find({ email })
    .then((data) => {
      console.log(data);
      if (data.length) {
        //Eleve exists

        //check if Eleve is verified
        if (!data[0].verified) {
          res.json({
            status: "FAILED",
            message: "Email hasn't been verified yet. Check your inbox",
          });
        } else {
          // proceed with email to reset password
          sendResetEmail(data[0], redirectUrl, res);
        }
      } else {
        res.json({
          status: "FAILED",
          message: "No account with the supplied email exists!",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "An error occured while checking for existing Eleve",
      });
    });
});

//send password reset email
const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
  const resetString = uuidv4() + _id;

  //First, we clear all existing reset record
  ElevePasswordReset.deleteMany({ eleveId: _id })
    .then((result) => {
      //Reset records deleted successfully
      //Now we send the email

      //mail options
      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Password Reset",
        html: `<p>We heard that you lost the password</p>.
    <p>Don't worry, use the link below to reset it</p>.
    <p>This link <b> expires in 60 minutes</b>.</p><p>Press <a href=${
      redirectUrl + "/" + _id + "/" + resetString
    }> 
    here</a> to proceed.</p>`,
      };

      //hash the reset string
      const saltRounds = 10;
      bcrypt
        .hash(resetString, saltRounds)
        .then((hashedResetString) => {
          //set values in password reset collection
          const newElevePasswordReset = new ElevePasswordReset({
            eleveId: _id,
            resetString: hashedResetString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
          });

          newElevePasswordReset
            .save()
            .then(() => {
              transporter
                .sendMail(mailOptions)
                .then(() => {
                  //reset email sent and password reset record saved
                  res.json({
                    status: "PENDING",
                    message: "Password reset email sent",
                  });
                })
                .catch((error) => {
                  res.json({
                    status: "FAILED",
                    message: "Password reset email failed",
                  });
                });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Couldn't save password reset data!",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.json({
            status: "FAILED",
            message: "An error occured while hashing the password reset data!",
          });
        });
    })
    .catch((error) => {
      res.json({
        status: "FAILED",
        message: "Clearing existing password reset records failed",
      });
    });
};

//Actually reset the password
router.post("/resetPassword", (req, res) => {
  console.log("A request has been made on /resetPassword api...");
  let { eleveId, resetString, newPassword } = req.body;

  ElevePasswordReset.find({ eleveId })
    .then((result) => {
      if (result.length > 0) {
        //password reset record exists so we proceed

        const { expiresAt } = result[0];
        const hashedResetString = result[0].resetString;

        //checking for expired reset string
        if (expiresAt < Date.now()) {
          ElevePasswordReset.deleteOne({ eleveId })
            .then(() => {
              //Reset record deleted successfully
              res.json({
                status: "FAILED",
                message: "Password reset link has expired.",
              });
            })
            .catch((error) => {
              //deletion failed
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Clearing password reset record failed",
              });
            });
        } else {
          //valid reset record exists so we validate the reset string
          //First compare the hashed reset string

          bcrypt
            .compare(resetString, hashedResetString)
            .then(() => {
              console.log(result);
              if (result) {
                //strings matched
                //hash password again

                const saltRounds = 10;
                bcrypt
                  .hash(newPassword, saltRounds)
                  .then((hashedNewPassword) => {
                    //update Eleve password
                    Eleve.updateOne(
                      { _id: eleveId },
                      { password: hashedNewPassword }
                    )
                      .then(() => {
                        //update complete. Now delete reset record
                        ElevePasswordReset.deleteOne({ eleveId })
                          .then(() => {
                            //both Eleve record and reset record updated
                            res.json({
                              status: "SUCCESS",
                              message: "Password has been reset successfully",
                            });
                          })
                          .catch((error) => {
                            res.json({
                              status: "FAILED",
                              message:
                                "An error occured while finalizing password reset.",
                            });
                          });
                      })
                      .catch((error) => {
                        res.json({
                          status: "FAILED",
                          message: "Updating Eleve password failed.",
                        });
                      });
                  })
                  .catch((error) => {
                    res.json({
                      status: "FAILED",
                      message: "An error occured while hashing new password",
                    });
                  });
              } else {
                //Existing record but incorrect reset string passed
                res.json({
                  status: "FAILED",
                  message: "Invalid password reset details passed.",
                });
              }
            })
            .catch((error) => {
              res.json({
                status: "FAILED",
                message: "Comparing password reset strings failed",
              });
            });
        }
      } else {
        //Password reset record doesn't exist
        res.json({
          status: "FAILED",
          message: "Password reset request not found",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Checking for existing password reset record failed.",
      });
    });
});
module.exports = router;
