const express = require("express");
const router = express.Router();

// mongodb Evaluation model
const Evaluation = require("./../models/Evaluation");

// mongodb Professeur model
const Professeur = require("./../models/Professeur");

// mongodb Ecole model
const Ecole = require("./../models/Ecole");

//get teacher data
router.get("/create/:professeurId", (req, res) => {
  console.log("A request has been made on /create/:professeurId api...");

  let { professeurId } = req.params;

  Professeur.find({ _id: professeurId })
    .then((result) => {
      console.log(result);
      if (result.length > 0) {
        //teacher record exists so we proceed
        Ecole.find()
          .then((ecoles) => {
            console.log("les ecoles");
            console.log(ecoles);
            // if (ecoles.length > 0) {
            if (ecoles.length > 0) {
              let formValues = {
                firstname: result[0].firstname,
                lastname: result[0].lastname,
                college: result[0].college,
                classes: result[0].classes,
                discipline: result[0].discipline,
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
