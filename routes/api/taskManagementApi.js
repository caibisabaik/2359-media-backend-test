var express = require('express');

module.exports = (app) => {
    let router = express.Router();

    router.post('/add', (req, res) => {
      const apiRes = req.body;
      app.addTask(apiRes.data.data).then(regRes => {
         res.send(regRes);
      }).catch(e => {
         res.send(e);
      });
    });
    router.post('/queryTimeLocation', (req, res) => {
      const apiRes = req.body;
      app.queryTimeLocation(apiRes.data.data).then(regRes => {
         res.send(regRes);
      }).catch(e => {
         res.send(e);
      });
    });

    return router;
}