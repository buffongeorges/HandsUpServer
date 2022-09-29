const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectId;

// mongodb Professeur model
const Professeur = require("./../models/Professeur");

// mongodb Eleve model
const Eleve = require("./../models/Eleve");

// mongodb Classes model
const Classe = require("./../models/Classe");

const datesAreInSameDay = (date1, date2) => {
  console.log(
    "la date de dernière modification dans cette classe: (heure Amérique)"
  );
  console.log(date1.toLocaleString());
  console.log("la date de l'ouverture de la page : (heure Amérique)");
  console.log(date2.toLocaleString());

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
    // && date1.getHours() === date2.getHours() && //FOR TESTING PURPOSES 1
    // date1.getMinutes() === date2.getMinutes() //FOR TESTING PURPOSES 2
  );
};

//get students by their class
router.post("/getClassStudents", (req, res) => {
  // let { classId } = req.params;
  console.log("A request has been made on /getClassStudents api...");
  console.log(req.body);
  let { classId, college, discipline, currentDate } = req.body;
  let collegeName;

  if (college.name) {
    collegeName = college.name;
  } else {
    collegeName = college;
  }
  let lastUpdateDate;
  let lastUpdatedSeance = 0;
  let allDates = [];
  let dateOfRequestIsDifferentThanLastUpdateDate;
  let isNewSeance;
  let nbSeances;
  let studentsAlphabeticalOrder;
  Classe.find({ _id: classId })
    .then((classNameResult) => {
      console.log("classNameResult");
      console.log(classNameResult);
      console.log("la discipline")
      console.log(discipline)
      if (classNameResult.length > 0) {
        Eleve.find({ classe: classNameResult[0].name, college: collegeName })
          // .sort({ position: 1 })
          .then((resultStudents) => {
            resultStudents.sort(
              (studentA, studentB) => {
                // console.log("position par discipline!!")
                // console.log("studentA")
                // console.log(studentA)
                const studentA_positionInGivenDiscipline = studentA.positions.find(matiere => matiere.matière == discipline).position;
                const studentB_positionInGivenDiscipline = studentB.positions.find(matiere => matiere.matière == discipline).position;
                console.log("studentA_positionInGivenDiscipline", studentA_positionInGivenDiscipline);
                console.log("studentB_positionInGivenDiscipline", studentB_positionInGivenDiscipline);
                return studentA_positionInGivenDiscipline - studentB_positionInGivenDiscipline;
              }
            );
            studentsAlphabeticalOrder = [...resultStudents];
            studentsAlphabeticalOrder.sort((studentA, studentB) =>
              studentA.lastname.localeCompare(studentB.lastname)
            );
            resultStudents.forEach((student) => {
              //look for update dates on participation section
              // if (student.lastUpdatedSeance) {
              //   lastUpdatedSeance = Math.max(
              //     student.lastUpdatedSeance,
              //     lastUpdatedSeance
              //   );
              // }
              let newParticipation = student.participation.find(
                (matiere) => matiere.matière == discipline
              );
              nbSeances = newParticipation.notes.length;
              if (newParticipation.lastUpdateTime) {
                allDates.push(newParticipation.lastUpdateTime);
              }
              if (newParticipation.lastUpdatedSeance) {
                lastUpdatedSeance = Math.max(newParticipation.lastUpdatedSeance, lastUpdatedSeance);
              }

              //look for update dates on bonus section
              let newBonus = student.bonus.find(
                (matiere) => matiere.matière == discipline
              );
              if (newBonus.lastUpdateTime) {
                allDates.push(newBonus.lastUpdateTime);
              }
              if (newBonus.lastUpdatedSeance) {
                lastUpdatedSeance = Math.max(newBonus.lastUpdatedSeance, lastUpdatedSeance);
              }

              //look for update dates on bonus section
              let newAvertissement = student.avertissement.find(
                (matiere) => matiere.matière == discipline
              );
              if (newAvertissement.lastUpdateTime) {
                allDates.push(newAvertissement.lastUpdateTime);
              }
              if (newAvertissement.lastUpdatedSeance) {
                lastUpdatedSeance = Math.max(newAvertissement.lastUpdatedSeance, lastUpdatedSeance);
              }
            });

            console.log("allDates");
            console.log(allDates);
            console.log(allDates.length);

            console.log("nombre de séances : ");
            console.log(nbSeances);

            if (allDates.length > 0) {
              lastUpdateDate = new Date(Math.max.apply(null, allDates));
              console.log("lastUpdateDate est : ");
              console.log(lastUpdateDate);

              dateOfRequestIsDifferentThanLastUpdateDate = !datesAreInSameDay(
                lastUpdateDate,
                new Date(currentDate)
              );
            } else {
              dateOfRequestIsDifferentThanLastUpdateDate = false; //if allDates is empty => no operation on the class before
              // or is the first time this class is opened so considered as same seance
              console.log(
                "le professeur n'a encore fait aucune modification sur cette classe"
              );
            }
            console.log("lastUpdatedSeance", lastUpdatedSeance);
            console.log("current seance", nbSeances);
            console.log(
              "dateOfRequestIsDifferentThanLastUpdateDate",
              dateOfRequestIsDifferentThanLastUpdateDate
            );
            if (dateOfRequestIsDifferentThanLastUpdateDate) {
              // the teacher is fetching this page on different day
              // if he's fetching the page on the same date than lastUpdatedDate, there's no reason of increasing seance...
              if (
                lastUpdatedSeance < nbSeances ||
                !lastUpdatedSeance /* first seance for classe*/
              ) {
                // the number of seances equals last updated seance which means that the seance must not be increased
                // not a new seance
                console.log(
                  "do not increase the seance \nTeacher is just checking something..."
                );
                isNewSeance = false;
              } else if (
                (lastUpdatedSeance == nbSeances && lastUpdatedSeance == 1) ||
                lastUpdatedSeance == nbSeances
              ) {
                // different day and last updated seance is not the last one
                // seance must be increased ++
                console.log("increase seance ++");
                isNewSeance = true;
              } else {
                console.log(
                  "there is something wrong with your seances indexes !!!"
                );
              }
            } else {
              // if he's fetching the page on the same date than lastUpdatedDate, there's no reason of increasing seance...
              if (lastUpdatedSeance == 0 && nbSeances == 1) {
                console.log("it's the first seance and no changes yet...");
              }
              else {
                console.log(
                  "the teacher made changes in this class on this day, \nNothing to do with seances indexes\n"
                );
              }
              isNewSeance = false;
            }
            console.log("c'est une nouvelle séance qui commence?");
            console.log("isNewSeance", isNewSeance);

            if (resultStudents.length > 0) {
              //students with classId have been found so we proceed
              res.json({
                status: "SUCCESS",
                data: {
                  classe: classNameResult[0],
                  students: resultStudents,
                  lastUpdateDateInClass: lastUpdateDate,
                  dateOfRequestIsDifferentThanLastUpdateDate:
                    dateOfRequestIsDifferentThanLastUpdateDate,
                  nbSeances: nbSeances,
                  studentsAlphabeticalOrder: studentsAlphabeticalOrder,
                  isNewSeance: isNewSeance,
                },
              });
            } else {
              //Teacher record doesn't exist
              res.json({
                status: "FAILED",
                message: "No student was found in this class",
              });
            }
          })
          .catch((error) => {
            console.log(error);
            res.json({
              status: "FAILED",
              message: "Checking for students in class failed.",
            });
          });
      } else {
        res.json({
          status: "FAILED",
          message: "No class was found with this id",
        });
      }
    })
    .catch((err) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Error while fetching class name.",
      });
    });
});

//increase a class seance index which means a new seance is starting
router.post("/increaseSeance", (req, res) => {
  console.log("A request has been made on /increaseSeance api...");
  console.log(req.body);
  let { classe, college, nbSeances, discipline } = req.body;
  let increaseSeanceData = { $set: {} };
  increaseSeanceData.$set[`bonus.$.nbSeances`] = nbSeances + 1;
  increaseSeanceData.$set[`avertissement.$.nbSeances`] = nbSeances + 1;
  increaseSeanceData.$set[`participation.$.nbSeances`] = nbSeances + 1;
  increaseSeanceData.$set[`participation.$.notes.${nbSeances}`] = 0;
  increaseSeanceData.$set[`avertissement.$.notes.${nbSeances}`] = 0;
  increaseSeanceData.$set[`bonus.$.notes.${nbSeances}`] = 0;

  console.log("increaseSeanceData");
  console.log(increaseSeanceData);
  // marksToUpdate.$set[`participation.$.notes.0`] = newParticipation;

  Eleve.updateMany(
    { classe: classe, college: college, "bonus.matière": discipline }, //filter
    increaseSeanceData
  )
    .then((resultStudents) => {
      // resultStudents.sort((studentA, studentB) => studentA.position - studentB.position);
      console.log("resultStudents");
      console.log(resultStudents);

      res.json({
        status: "SUCCESS",
        message: "student data has been updated successfully",
      });
    })
    .catch((err) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Error while ending the class sequence.",
      });
    });
});

//end a class sequence
router.post("/endSequence", (req, res) => {
  console.log("A request has been made on /endSequence api...");
  console.log(req.body);
  let { classe, college, nbSeances, discipline } = req.body;
  let endSequenceData = { $set: {} };
  endSequenceData.$set[`bonus.$.nbSeances`] = 1;
  endSequenceData.$set[`avertissement.$.nbSeances`] = 1;
  endSequenceData.$set[`participation.$.nbSeances`] = 1;
  endSequenceData.$set[`participation.$.notes`] = [0];
  endSequenceData.$set[`avertissement.$.notes`] = [0];
  endSequenceData.$set[`bonus.$.notes`] = [0];

  console.log("endSequenceData");
  console.log(endSequenceData);
  // marksToUpdate.$set[`participation.$.notes.0`] = newParticipation;

  Eleve.updateMany(
    { classe: classe, college: college, "bonus.matière": discipline }, //filter
    endSequenceData
  )
    .then((resultStudents) => {
      // resultStudents.sort((studentA, studentB) => studentA.position - studentB.position);
      console.log("resultStudents");
      console.log(resultStudents);

      res.json({
        status: "SUCCESS",
        message: "student data has been updated successfully",
      });
    })
    .catch((err) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Error while ending the class sequence.",
      });
    });
});

module.exports = router;
