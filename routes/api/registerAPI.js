var express = require('express');

module.exports = (app) => {
    let router = express.Router();

    router.post('/register', (req, res) => {
      const apiRes = req.body;
      app.registerUser(apiRes.data.data).then(regRes => {
         res.send(regRes);
      }).catch(e => {
         res.send(e);
      });
    });

    router.post('/validphone', (req, res) => {
      const apiRes = req.body;
      app.validPhoneNumber(apiRes.data.data).then(regRes => {
         res.send(regRes);
      }).catch(e => {
         res.send(e);
      });
     });

     router.post('/validemail', (req, res) => {
      const apiRes = req.body;
      app.validEmail(apiRes.data.data).then(regRes => {
         res.send(regRes);
      }).catch(e => {
         res.send(e);
      });
     });

    return router;
}