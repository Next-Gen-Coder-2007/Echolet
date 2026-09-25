const express = require('express')
const { request: Req } = require('express')
const { response: Res } = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }))
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api', (req: typeof Req, res : typeof Res) => {
    res.send({
        status: 'OK',
        message: 'Working Perfectly',
    })
});

app.listen(port, () => console.log('Server Listening on Port 3000'));