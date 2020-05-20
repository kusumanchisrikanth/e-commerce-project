var express = require('express');
var router = express.Router();

/* GET index page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/profile', function(req, res, next) {
  res.render('profile');
});

router.get('/homepage', function(req, res, next) {
  res.render('homepage');
});

module.exports = router;
