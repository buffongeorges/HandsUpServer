const express = require("express");
const router = express.Router();

// mongodb Professeur model
const Professeur = require("./../models/Professeur");

// mongodb Eleve model
const Eleve = require("./../models/Eleve");

// mongodb Classes model
const Classe = require("./../models/Classe");

//get teacher data
router.get("/get/:professeurId", (req, res) => {
  console.log("A request has been made on /get/:professeurId api...");
  console.log(req.params);
  let { professeurId } = req.params;

  Professeur.find({ _id: professeurId })
    .then((result) => {
      console.log(result);
      if (result.length > 0) {
        //teacher record exists so we proceed
        res.json({
          status: "SUCCESS",
          data: result[0],
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

//add student to class
router.post("/add/student", (req, res) => {
  console.log("A request has been made on /add/student api...");
  console.log(req.body);
  let {
    _id,
    firstname,
    lastname,
    classe,
    photo,
    position,
    participation,
    bonus,
    avertissement,
    dateOfBirth,
    college
  } = req.body;
  // Checking if Eleve already exists
  Eleve.find({ _id })
    .then((result) => {
      if (result.length) {
        // A Professeur already exists
        res.json({
          status: "FAILED",
          message: "Eleve with the provided id already exists",
        });
      } else {
        // Try to create Eleve

        const newEleve = new Eleve({
          _id,
          firstname,
          lastname,
          verified: true,
          admin: false,
          avertissement,
          bonus,
          participation,
          photo,
          position,
          classe,
          dateOfBirth,
          email: null,
          password: null,
          college,
        });
        newEleve
          .save()
          .then((result) => {
            //Eleve was added successfully
            console.log("l'eleve");
            console.log(result);
            res.json({
              status: "SUCCESS",
              data: "The student was added successfully",
            });
          })
          .catch((err) => {
            res.json({
              status: "FAILED",
              message: "An error occured while saving Eleve!",
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
});
module.exports = router;
