const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");
const { parse } = require("csv-parse");
const defaultBirthday = "02/01/2010";

// mongodb Professeur model
const Professeur = require("./../models/Professeur");

// mongodb Ecole model
const Ecole = require("./../models/Ecole");

// mongodb Professeur verification model
const ProfesseurVerification = require("./../models/ProfesseurVerification");

// mongodb Professeur verification model
const ProfesseurPasswordReset = require("./../models/ProfesseurPasswordReset");

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
const Discipline = require("../models/Discipline");
const { deleteImageFromS3 } = require("../s3");
const Eleve = require("../models/Eleve");
const Classe = require("../models/Classe");

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

//Signup
router.post("/signup", (req, res) => {
  console.log("A request has been made on /signup api...");
  let { firstname, lastname, email, password, dateOfBirth } = req.body;
  firstname = firstname.trim();
  lastname = lastname.trim();
  email = email.trim();
  password = password.trim();
  dateOfBirth = dateOfBirth.trim();

  if (
    firstname == "" ||
    lastname == "" ||
    email == "" ||
    password == "" ||
    dateOfBirth == ""
  ) {
    res.json({
      status: "FAILED",
      message: "Empty input fields!",
    });
  } else if (!/^[a-zA-Z ]*$/.test(firstname)) {
    res.json({
      status: "FAILED",
      message: "Invalid firstname entered",
    });
  } else if (!/^[a-zA-Z ]*$/.test(lastname)) {
    res.json({
      status: "FAILED",
      message: "Invalid lastname entered",
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
    // Checking if Professeur already exists
    Professeur.find({ email })
      .then((result) => {
        if (result.length) {
          // A Professeur already exists
          res.json({
            status: "FAILED",
            message: "Professeur with the provided email already exists",
          });
        } else {
          // Try to create Professeur

          //password handling
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashedPassword) => {
              const newProfesseur = new Professeur({
                firstname,
                lastname,
                email,
                password: hashedPassword,
                dateOfBirth,
                verified: false,
                admin: false,
                noteDepart: 10,
                avertissement: 0,
                bonus: 0,
                participation: 0,
                discipline: null,
              });
              newProfesseur
                .save()
                .then((result) => {
                  //handle account verification
                  sendVerificationEmail(result, res);
                })
                .catch((err) => {
                  res.json({
                    status: "FAILED",
                    message:
                      "An error occured while saving Professeur account!",
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
          message: "An error occured while checking for existing Professeur!",
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
    subject: "Vérifier votre email",
    html: `<p>Vérifiez votre adresse pour terminer l’inscription et ouvrir une session dans votre compte.</p>.
    <p>Ce lien<b> expire dans 6 heures</b>.</p><p>Cliquer <a href=${
      currentUrl + "professeur/verify/" + _id + "/" + uniqueString
    }> 
    ici</a> pour continuer.</p>`,
  };

  //hash the uniqueString
  const saltRounds = 10;
  bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) => {
      //set values in ProfesseurVerification collection
      const newVerification = new ProfesseurVerification({
        professeurId: _id,
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
router.get("/verify/:professeurId/:uniqueString", (req, res) => {
  console.log(
    "A request has been made on /verify/:professeurId/:uniqueString api..."
  );

  let { professeurId, uniqueString } = req.params;

  ProfesseurVerification.find({ professeurId })
    .then((result) => {
      if (result.length > 0) {
        //Professeur verification record exists so we proceed

        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;

        //checking for expired unique string
        if (expiresAt < Date.now()) {
          //record has expired so we delete it
          ProfesseurVerification.deleteOne({ professeurId })
            .then((result) => {
              Professeur.deleteOne({ _id: professeurId })
                .then(() => {
                  let message = "Link has expired. Please sign up again";
                  res.redirect(
                    `/professeur/verified/error=true&message=${message}`
                  );
                })
                .catch((error) => {
                  let message =
                    "Clearing Professeur with expired unique string failed";
                  res.redirect(
                    `/professeur/verified/error=true&message=${message}`
                  );
                });
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occured while clearing expired Professeur verification record";
              res.redirect(
                `/professeur/verified/error=true&message=${message}`
              );
            });
        } else {
          //valid record exists so we validate the Professeur string
          //First compare the hashed unique string

          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                //strings match

                Professeur.updateOne({ _id: professeurId }, { verified: true })
                  .then(() => {
                    ProfesseurVerification.deleteOne({ professeurId })
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
                          `/professeur/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((error) => {
                    let message =
                      "An error occured while updating Professeur record to show verified.";
                    res.redirect(
                      `/professeur/verified/error=true&message=${message}`
                    );
                  });
              } else {
                //existing record but incorrect verification details passed.
                let message =
                  "Invalid verification details passed. Check your inbox";
                res.redirect(
                  `/professeur/verified/error=true&message=${message}`
                );
              }
            })
            .catch((error) => {
              let message = "An error occured while comparing unique strings";
              res.redirect(
                `/professeur/verified/error=true&message=${message}`
              );
            });
        }
      } else {
        //Professeur verification record doesn't exist
        let message =
          "Account record doesn't exist or has been verified already. Please sign up or log in";
        res.redirect(`/professeur/verified/error=true&message=${message}`);
      }
    })
    .catch((error) => {
      console.log(error);
      let message =
        "An error occured while checking for existing Professeur verification record";
      res.redirect(`/professeur/verified/error=true&message=${message}`);
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
    //Check if Professeur exist
    Professeur.find({ email })
      .then((data) => {
        if (data.length) {
          //Professeur exists

          //check if Professeur is verified

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
          message: "An error occured while checking for existing Professeur",
        });
      });
  }
});

//Password reset stuff
router.post("/requestPasswordReset", (req, res) => {
  console.log("A request has been made on /requestPasswordReset api...");

  const { email, redirectUrl } = req.body;

  //check if email exists
  Professeur.find({ email })
    .then((data) => {
      console.log(data);
      if (data.length) {
        //Professeur exists
        //check if Professeur is verified
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
        message: "An error occured while checking for existing Professeur",
      });
    });
});

//send password reset email
const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
  const resetString = uuidv4() + _id;

  //First, we clear all existing reset record
  ProfesseurPasswordReset.deleteMany({ professeurId: _id })
    .then((result) => {
      //Reset records deleted successfully
      //Now we send the email

      //mail options
      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Password Reset",
        html: `<p>Il semble que vous ayez perdu votre mot de passe</p>.
    <p>Ne vous inquiétez pas, utilisez le lien ci-dessous pour le réinitialiser</p>.
    <p>Ce lien <b> expire dans 60 minutes</b>.</p><p>Cliquez <a href=${
      redirectUrl + "/" + _id + "/" + resetString
    }> 
    ici</a> pour continuer.</p>`,
      };

      //hash the reset string
      const saltRounds = 10;
      bcrypt
        .hash(resetString, saltRounds)
        .then((hashedResetString) => {
          //set values in password reset collection
          const newProfesseurPasswordReset = new ProfesseurPasswordReset({
            professeurId: _id,
            resetString: hashedResetString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
          });

          newProfesseurPasswordReset
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
                  console.log(error);
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

  let { professeurId, resetString, newPassword } = req.body;

  ProfesseurPasswordReset.find({ professeurId })
    .then((result) => {
      console.log(req.body);
      console.log("result");
      console.log(result);
      if (result.length > 0) {
        //password reset record exists so we proceed

        const { expiresAt } = result[0];
        const hashedResetString = result[0].resetString;

        //checking for expired reset string
        if (expiresAt < Date.now()) {
          ProfesseurPasswordReset.deleteOne({ professeurId })
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
                    //update professeur password
                    Professeur.updateOne(
                      { _id: professeurId },
                      { password: hashedNewPassword }
                    )
                      .then(() => {
                        //update complete. Now delete reset record
                        ProfesseurPasswordReset.deleteOne({ professeurId })
                          .then(() => {
                            //both Professeur record and reset record updated
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
                          message: "Updating Professeur password failed.",
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

//update teacher data
router.post("/edit", (req, res) => {
  console.log("A request has been made on /edit the teacher data api...");
  console.log(req.body);
  let {
    professeurId,
    newFirstname,
    newLastname,
    newCollege,
    newClasses,
    newPhoto,
    newNoteDepart,
    newParticipation,
    newAvertissement,
    newBonus,
    newDiscipline,
    newEndOfTrimestre,
  } = req.body;

  console.log("newEndOfTrimestre");
  console.log(newEndOfTrimestre);

  let imageNameInS3;
  if (newPhoto) {
    imageNameInS3 = newPhoto.substring(newPhoto.lastIndexOf("/") + 1);
    console.log("imageNameInS3");
    console.log(imageNameInS3);
  }

  Ecole.updateOne(
    { name: newCollege.name },
    {
      endOfTrimestre: newEndOfTrimestre,
    }
  )
    .then((result) => {
      Professeur.find({ _id: professeurId })
        .then((result) => {
          if (result.length > 0) {
            console.log("le professeur");
            console.log(result);
            let oldPictureToDelete;
            if (result[0].photo) {
              oldPictureToDelete = result[0].photo.substring(
                result[0].photo.lastIndexOf("/") + 1
              );
            }
            //teacher record exists so we proceed
            console.log("oldPictureToDelete");
            console.log(oldPictureToDelete);
            console.log("imageNameInS3");
            console.log(imageNameInS3);
            if (oldPictureToDelete && oldPictureToDelete != imageNameInS3) {
              //first we remove old picture from S3
              console.log("deleting picture from S3...");
              deleteImageFromS3(oldPictureToDelete);
              console.log(
                `image ${imageNameInS3} has been deleted from the bucket`
              );
            }
            Professeur.updateOne(
              { _id: professeurId }, //filter
              {
                firstname: newFirstname,
                lastname: newLastname,
                college: newCollege,
                classes: newClasses,
                photo: newPhoto,
                noteDepart: newNoteDepart,
                participation: newParticipation,
                avertissement: newAvertissement,
                bonus: newBonus,
                discipline: newDiscipline,
              }
            )
              .then(() => {
                res.json({
                  status: "SUCCESS",
                  message: "Teacher data has been updated successfully",
                });
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message: "An error occured while updating teacher data",
                  error: err,
                });
              });
          } else {
            //Teacher record doesn't exist
            res.json({
              status: "FAILED",
              message: "Teacher with given id not found",
            });
          }
        })
        .catch((error) => {
          console.log(error);
          res.json({
            status: "FAILED",
            message: "Checking for teacher record failed.",
          });
        });
    })
    .catch((err) => {
      res.json({
        status: "FAILED",
        message: "An error occured while updating the school end of trimestre",
        error: err,
      });
    });
});
function saveStudentInDB(
  firstname,
  lastname,
  positionIndex,
  isEmpty,
  college,
  classe
) {
  Discipline.find()
    .then((disciplines) => {
      // console.log("les disciplines trouvées");
      // console.log(disciplines);
      if (disciplines.length > 0) {
        let participationArray = [];
        let bonusArray = [];
        let avertissementArray = [];
        let positionArray= []
        disciplines.forEach((discipline) => {
          participationArray.push({
            matière: discipline.name,
            nbSeances: 1,
            notes: [0],
          });
          bonusArray.push({
            matière: discipline.name,
            nbSeances: 1,
            notes: [0],
          });
          avertissementArray.push({
            matière: discipline.name,
            nbSeances: 1,
            notes: [0],
          });
          positionArray.push({
            matière: discipline.name,
            position: positionIndex,
          });
        });

        const newStudent = new Eleve({
          firstname: firstname,
          lastname: lastname,
          verified: true,
          admin: false,
          avertissement: avertissementArray,
          bonus: bonusArray,
          participation: participationArray,
          photo: "/images/blank.png",
          position: positionIndex,
          positions: positionArray,
          classe: classe,
          dateOfBirth: new Date(defaultBirthday),
          email: null,
          password: null,
          college: college,
          empty: isEmpty,
        });
        // console.log("new student in db:");
        // console.log(newStudent);
        // we only create a new user, if that student doesn't exists yet in DB. To find the object we use the key : firstname,lastname,classe
        Eleve.find({
          firstname: firstname,
          lastname: lastname,
          classe: classe,
          college: college,
        }).then((foundStudent) => {
          if (foundStudent.length > 0) {
            console.log(`${firstname} ${lastname} already exists!`);
          } else {
            newStudent
              .save()
              .then((result) => {
                //Eleve was added successfully
                // console.log("l'eleve");
                // console.log(result);
                console.log(
                  `The user ${firstname} ${lastname} has been added successfully`
                );
                return result;
              })
              .catch((err) => {
                console.log(err);
              });
          }
        });
      } else {
        //Discipline record doesn't exist
        console.log("No discipline was found in the DB");
      }
    })
    .catch((err) => {
      console.log("Error occured while fetching for Discipline record");
      console.log(err);
    });
}

function updateEcoleAndClasseCollection(college, classe) {
  // console.log("le college");
  // console.log(college);
  // console.log("la classe");
  // console.log(classe);
  Ecole.find({ name: college })
    .then((ecoleResult) => {
      // we assume that schools are already initialized in db by an admin
      // console.log("ecoleResult");
      // console.log(ecoleResult);
      Classe.find({
        name: classe,
        "ecole.name": college,
      })
        .then((classResult) => {
          if (classResult.length == 0) {
            //if classResult.length > 0, then the class is already created, nothing to do on it
            const newClasse = new Classe({
              name: classe,
              ecole: {
                _id: ecoleResult[0]._id,
                name: college,
              },
            });
            newClasse
              .save()
              .then((result) => {
                //Eleve was added successfully
                // console.log("la classe");
                // console.log(result);
                console.log(`The classe ${classe} has been added successfully`);
                // add the class to ecole:
                Ecole.updateOne(
                  { name: college },
                  {
                    $push: {
                      classes: { _id: result._id, name: classe },
                    },
                  }
                )
                  .then(() => {
                    console.log(`${college} was updated successfully`);
                  })
                  .catch((err) => {
                    console.log("An error occured while updating Ecole");
                  });
              })
              .catch((err) => {
                console.log(err);
              });
          }
        })
        .catch((err) => {
          console.log("Checking for classe record failed.");
        });
    })
    .catch((err) => {
      console.log("Checking for ecole record failed.");
    });
}

function getCsvNumberOfRows(filePath, startingRowIndex, endingRowIndex) {
  let count = 1;
  let parseParams = {
    delimiter: ",",
  };
  if (startingRowIndex) {
    parseParams["from_line"] = startingRowIndex;
  }
  if (endingRowIndex) {
    parseParams["to_line"] = endingRowIndex;
  }

  console.log("parseParams");
  console.log(parseParams);
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on("error", (error) => {
        reject(error);
      })
      .pipe(parse(parseParams))
      .on("data", function (data) {
        // Increase count
        count += 1;
      })
      .on("end", () => {
        console.log("Done");
        console.log("Total count: " + count);
        resolve(count);
      });
  });
}

async function processCSVImport(req) {
  let returnStatus;

  const fileNbRows = await getCsvNumberOfRows(req.file.path);
  console.log("/////fileNbRows");
  console.log(fileNbRows);
  let currentRow = 1;
  let firstClass;
  let indexStudent = 0;
  let studentClass;
  return new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path)
      .on("error", (error) => {
        console.log(error.message);
        console.log(error);
        // res.json({
        //   status: "FAILED",
        //   message: "An error occured while parsing csv file.",
        // });
        reject(error);
      })
      .pipe(parse({ delimiter: ",", from_line: 1, to_line: fileNbRows }))
      .on("data", async (student) => {
        // console.log("indexStudent")
        // console.log(indexStudent)
        console.log("----------------------");
        console.log("le student");
        console.log(student);
        const studentData = student[0].split(";");
        const lastname = studentData[0];
        const firstname = studentData[1];
        const classe = studentData[2];
        if (currentRow == 1) {
          firstClass = classe;
        }

        console.log("ancienne valeur de classe");
        console.log(studentClass);
        console.log("nouvelle valeur de classe");
        console.log(classe);

        if (studentClass == classe || !studentClass) {
          //create new student object and save it
          saveStudentInDB(
            firstname,
            lastname,
            indexStudent,
            false,
            req.body.studentsCollege,
            classe
          );
          //same class so we increase index for position
          indexStudent++;
        } else {
          //studentClass != classe || is the first class of the file
          //before dealing with a different class, we don't forget to add empty students to fill class
          const emptyPlacesLeft = 54 - indexStudent; // vaut 20 dans l'exemple
          console.log(
            `il reste ${emptyPlacesLeft} à ajouter dans la classe avant de passer à la suivante`
          );
          for (var i = 0; i < emptyPlacesLeft; i++) {
            saveStudentInDB(
              `EmptyStudentFirstname${indexStudent + i}`,
              `EmptyStudentLastname${indexStudent + i}`,
              indexStudent + i,
              true,
              req.body.studentsCollege,
              studentClass
            );
          }
          //save first student of new class
          saveStudentInDB(
            firstname,
            lastname,
            0,
            false,
            req.body.studentsCollege,
            classe
          );

          //check if class already exists. If not we create a new classe and add that classe to the given school
          // to find the classe we will use the key: name,ecole.name

          //different class, index back to 0
          indexStudent = 1;
          console.log("firstClass", firstClass);

          //add other classes
          updateEcoleAndClasseCollection(req.body.studentsCollege, classe);
        }

        //add the first class in csv file :
        if (currentRow == 1) {
          updateEcoleAndClasseCollection(req.body.studentsCollege, firstClass);
        }
        currentRow++;
        // if (currentRow == fileNbRows) {
        //   updateEcoleAndClasseCollection(
        //     req.body.studentsCollege,
        //     studentClass
        //   );
        // }
        //after dealing with that student, we set the value of studentClass to classe of that student and process to next studentLine
        studentClass = classe;
        console.log("l'index est", currentRow);
        console.log(currentRow == fileNbRows);
        console.log("l'index de currentStudent", indexStudent);

        //if it's the last row, fill the class also
        if (currentRow == fileNbRows) {
          const emptyPlacesLeft = 54 - indexStudent; // vaut 46 dans l'exemple
          console.log(
            `il reste ${emptyPlacesLeft} à ajouter dans la classe avant de passer à la suivante`
          );
          for (var i = 0; i < emptyPlacesLeft; i++) {
            saveStudentInDB(
              `EmptyStudentFirstname${indexStudent + i}`,
              `EmptyStudentLastname${indexStudent + i}`,
              indexStudent + i,
              true,
              req.body.studentsCollege,
              studentClass
            );
          }
        }
        returnStatus = "SUCCESS YET";
      })
      .on("end", () => {
        console.log("the import of new students was successful!");
        // res.json({
        //   status: "SUCCESS",
        //   message: "The import of new students was successful!",
        // });
        resolve(returnStatus);
      });
  });
}

//import new students from csv file
router.post("/importStudents", upload.single("students"), async (req, res) => {
  console.log("A request has been made on /importStudents api...");
  console.log("le fichier");
  console.log(req.file);

  const returnStatus = await processCSVImport(req);
  console.log("returnStatus");
  console.log(returnStatus);
  res.json({
    status: "SUCCESS",
    message: "The import of new students was successful!",
  });
});

//get teacher data
router.get("/get/:professeurId", (req, res) => {
  console.log("A request has been made on /get/:professeurId api...");

  let { professeurId } = req.params;

  Professeur.find({ _id: professeurId })
    .then((result) => {
      console.log(result);
      if (result.length > 0) {
        //teacher record exists so we proceed
        Ecole.find()
          .then((ecoles) => {
            console.log("les ecoles")
            console.log(ecoles)
            // if (ecoles.length > 0) {
            Discipline.find()
              .then((disciplines) => {
                console.log("les disciplines trouvées");
                console.log(disciplines);
                if (disciplines.length > 0) {
                  let formValues = {
                    firstname: result[0].firstname,
                    lastname: result[0].lastname,
                    college: result[0].college,
                    classes: result[0].classes,
                    photo: result[0].photo,
                    noteDepart: result[0].noteDepart,
                    avertissement: result[0].avertissement,
                    participation: result[0].participation,
                    bonus: result[0].bonus,
                    admin: result[0].admin ? true : false,
                    ecoles: ecoles,
                    discipline: result[0].discipline,
                    disciplines: disciplines,
                  };
                  res.json({
                    status: "SUCCESS",
                    data: formValues,
                  });
                } else {
                  //Discipline record doesn't exist
                  res.json({
                    status: "FAILED",
                    message: "No discipline was found in the DB!",
                  });
                }
              })
              .catch((err) => {});
            // } else {
            //   //School record doesn't exist
            //   res.json({
            //     status: "FAILED",
            //     message: "No school was found in the DB!",
            //   });
            // }
          })
          .catch((err) => {
            res.json({
              status: "FAILED",
              message: "An error occured while fetching schools",
              error: err,
            });
          });
      } else {
        //Teacher record doesn't exist
        res.json({
          status: "FAILED",
          message: "Teacher with given id not found",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Checking for teacher record failed.",
      });
    });
});
module.exports = router;
