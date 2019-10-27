const express = require("express");
const body_parser = require("body-parser");

const { getToken, searchCharacter } = require("./controllers");

const app = express();

app.use(body_parser.json());
app.use(body_parser.urlencoded());

app.get('/auth', getToken);
app.get('/characters/search/:search', searchCharacter);


const PORT = process.env.PORT || 3030;
app.listen(PORT, console.log(`Running on port: ${PORT}`))