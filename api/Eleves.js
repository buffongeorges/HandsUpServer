const express = require("express");
const router = express.Router();

// mongodb Professeur model
const Professeur = require("./../models/Professeur");

// mongodb Eleve model
const Eleve = require("./../models/Eleve");

// mongodb Classes model
const Classe = require("./../models/Classe");
const { decrypt } = require("../cryptoFunctions");

//get student data
router.get("/get/:eleveId", (req, res) => {
  console.log("A request has been made on /get/:eleveId api...");
  console.log(req.params);
  let { eleveId } = req.params;

  Eleve.find({ _id: eleveId })
    .then((result) => {
      if (result.length > 0) {
        //student record exists so we proceed
        Classe.find({ name: result[0].classe })
          .then((classResult) => {
            console.log("classResult.......")
            console.log(classResult)
            let decryptedPwd = result[0].password;
            if (result[0].password) {
              decryptedPwd = decrypt(result[0].password);
            }
            let formValues = {
              firstname: result[0].firstname,
              lastname: result[0].lastname,
              college: classResult[0].ecole,
              classe: classResult[0],
              photo: result[0].photo,
              dateOfBirth: result[0].dateOfBirth,
              email: result[0].email,
              password: decryptedPwd,
              participations: result[0].participation,
              avertissements: result[0].avertissement,
              bonus: result[0].bonus
            };
            res.json({
              status: "SUCCESS",
              data: formValues,
            });
          })
          .catch((error) => {
            console.log(error);
            res.json({
              status: "FAILED",
              message: "Checking for school in class table failed.",
            });
          });
      } else {
        //student record doesn't exist
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
        message: "Checking for teacher record failed.",
      });
    });
});

module.exports = router;
