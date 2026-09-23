const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }))
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api', (req, res) => {
    res.send({
        status: 'OK',
        message: 'Working Perfectly',
    })
});

app.listen(3000, () => console.log('Server Listening on Port 3000'));