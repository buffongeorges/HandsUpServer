//méthode 1 : front -> server -> s3
// require("dotenv").config;

// const fs = require('fs');

// const S3 = require("aws-sdk/clients/s3");

// const bucketName = process.env.AWS_BUCKET_NAME;
// const region = process.env.AWS_BUCKET_REGION;
// const accessKeyId = process.env.AWS_ACCESS_KEY;
// const secretAccessKey = process.env.AWS_SECRET_KEY;

// const s3 = new S3({
//   region,
//   accessKeyId,
//   secretAccessKey,
// });

// //uploads a file to s3
// function uploadFile(file) {
//   const fileStream = fs.createReadStream(file.path);

//   const uploadParams = {
//     Bucket: bucketName,
//     Body: fileStream,
//     Key: file.filename,
//   };

//   return s3.upload(uploadParams).promise();
// }
// exports.uploadFile = uploadFile;

// //downloads a file from s3
// function getFileStream(fileKey) {
//     const downloadParams = {
//         Key: fileKey,
//         Bucket: bucketName
//     }
//     return s3.getObject(downloadParams).createReadStream();
// }
// exports.getFileStream = getFileStream;

//méthode 2 : front -> s3
const aws = require("aws-sdk");
require("dotenv").config;
const crypto = require("crypto");
const util = require("util");
// const DeleteObjectCommand = require("@aws-sdk/client-s3");

const bucketName = "hands-up-direct-upload-react";
const region = "us-west-2";
const accessKeyId = process.env.AWS_ACCESS_KEY_DIRECT;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY_DIRECT;
const randomBytes = util.promisify(crypto.randomBytes);

//pour la prod definir ces variables directement sur Heroku!

const s3 = new aws.S3({
  region,
  accessKeyId,
  secretAccessKey,
  signatureVersion: "v4",
});

async function generateUploadURL() {
  const rawBytes = await randomBytes(16);
  const imageName = rawBytes.toString("hex");

  const params = {
    Bucket: bucketName,
    Key: imageName,
    Expires: 60,
  };

  const uploadURL = await s3.getSignedUrlPromise("putObject", params);
  return uploadURL;
}
exports.generateUploadURL = generateUploadURL;

async function deleteImageFromS3(imageName) {
  const deleteParams = {
    Bucket: bucketName,
    Key: imageName,
  };
  // const command = new DeleteObjectCommand(deleteParams);
  await s3.deleteObject(deleteParams, function (err, data) {
    if (err) console.log(err, err.stack);
    else console.log("delete", data);
  });
}
exports.deleteImageFromS3 = deleteImageFromS3;
