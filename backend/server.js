const express = require("express");
const path = require("path");

const HTTP_PORT = process.env.PORT || 8080;

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));
app.listen(HTTP_PORT, () => {
  console.log(`Running server at http://localhost:${HTTP_PORT}`);
});
