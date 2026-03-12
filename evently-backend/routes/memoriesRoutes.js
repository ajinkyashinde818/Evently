const express = require("express");
const router = express.Router();

const memoriesController = require("../controllers/memoriesController");

const upload = require("../config/uploadMedia");


/* ================= UPLOAD EVENT IMAGES ================= */

router.post(
"/upload-images/:eventId",
upload.array("images",10),
memoriesController.uploadImages
);


/* ================= UPLOAD CERTIFICATES ================= */

router.post(
"/upload-certificates/:eventId",
upload.array("certificates",10),
memoriesController.uploadCertificates
);


/* ================= GET EVENT IMAGES ================= */

router.get(
"/images/:eventId",
memoriesController.getEventImages
);


/* ================= GET CERTIFICATES ================= */

router.get(
"/certificates/:eventId",
memoriesController.getCertificates
);

module.exports = router;