const express = require('express');
const path = require('path');
const { getData } = require('./app');
const app = express();

const port = process.env.NODE_ENV === 'production' ? process.env.PORT : 3000;

getData()

setInterval(() => {
  getData()
}, 1000 * 60 * 30);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'college_rep_visits.html'));
})

app.listen(port, () => console.log(`listening on port ${port}`));