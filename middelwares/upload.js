const multer = require("multer");
const fs = require("fs");

// Set up local storage for images
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const filePath = './public';
    await fs.promises.mkdir(filePath, { recursive: true });
    cb(null, filePath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
