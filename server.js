//mongodb
require("./config/db");

const app = require("express")();

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const port = process.env.PORT || 3002;

//cors
const cors = require("cors");
app.use(cors());

const UserRouter = require("./api/User");
const ProfesseurRouter = require("./api/Professeur");
const ClassesRouter = require("./api/Classes");
const ClasseRouter = require("./api/Classe");
const EleveRouter = require("./api/Eleve");
const ElevesRouter = require("./api/Eleves");
const EvaluationRouter = require("./api/Evaluation");

const { /*uploadFile, getFileStream, */generateUploadURL } = require("./s3");

// for accepting post form data
const bodyParser = require("express").json;
app.use(bodyParser());

app.use("/user", UserRouter);
app.use("/professeur", ProfesseurRouter);
app.use("/classe", ClasseRouter);
app.use("/classes", ClassesRouter);
app.use("/eleve", EleveRouter);
app.use("/eleves", ElevesRouter);
app.use("/evaluation", EvaluationRouter);

// app.get('/images/:key', (req, res) => {
//   const key = req.params.key;
//   const readStream = getFileStream(key);

//   readStream.pipe(res);

// });
app.get("/s3Url", async (req, res) => {
  const url = await generateUploadURL();
  console.log('URL:')
  console.log(url)
  res.send({url});
});

// app.post("/formDataTest", upload.single("avatar"), async (req, res) => {
//   const file = req.file;
//   console.log('le fichier.....')
//   console.log(file);

//   // apply filter if needed
//   // resize image if needed

//   // const result = await uploadFile(file);
//   // await unlinkFile(file.path);
//   // console.log(result);

//   // res.send({imagePath: `/images/${result.Key}`});
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
