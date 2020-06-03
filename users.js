var express = require('express');
var router = express.Router();
const monk = require('monk')
const db = monk('localhost:27017/dealup')
const users = db.get('users')
const adds = db.get('adds')
var multer  = require('multer')
const path = require('path')
const bcrypt = require('bcrypt');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})
var upload = multer({ storage: storage })

/* GET login and signup page */
router.get('/signup', function(req, res) {
  if(req.session && req.session.user){
    res.redirect('/')
  }else{
    res.render('signup',{error:false})
  }
});

/* POST signup form */
router.post('/signup', upload.single('photo') , function(req,res){
  users.find({"email":req.body.email},function(err,docs){
    console.log(err,docs)
    if(docs[0]){
      res.render('signup',{error:"email already exists,signup unsuccessful"})
    }else{
      let details = {
        name:req.body.name,
        email:req.body.email,
        phone:req.body.phone,
        password:bcrypt.hashSync(req.body.password, 10),
        photo:req.file.filename
      }
      users.insert(details,function(err,docs){
        if(err){
          console.log(err)
        }else{
          res.redirect('/')
        }
      })
    }
  })
})

/* POST login and made him authenticated */
router.post('/login',function(req,res){
  users.findOne({"email":req.body.email},function(err,docs){
    if(err){
      console.log(err)
    }else if(!docs){
      res.render('signup',{error:"login unsuccessful, invalid mail or password"})
    }else{
      if(bcrypt.compareSync(req.body.password, docs.password)){
        req.session.user = docs;
        delete docs.password;
        res.redirect('/')
      }else{
        res.render('signup',{error:"invalid password"})
      }
    }
  })
})

/* GET logout */
router.get('/logout',function(req,res){
  req.session.reset()
  res.redirect('/')
})

/* GET profile page */
router.get('/profile', function(req,res) {
  if(req.session && req.session.user){
    details = {
      name:req.session.user.name,
      phone:req.session.user.phone,
      email:req.session.user.email,
      photo:req.session.user.photo
    }
    adds.find({ownerid:req.session.user._id},function(err,docs){
      res.render('profile',{details:details,docs:docs})
    })
  }else{
    res.redirect('/')
  }
})

/* GET update form */
router.get('/update',function(req,res){
  if(req.session && req.session.user){
    users.findOne({"_id":req.session.user._id}, function(err,docs){
      if(err){
        console.log(err)
      }else{
        res.render('update',{docs:docs})
      }
    })
  }else{
    res.redirect('/')
  }
})

/* UPDATE user details */
router.post('/update',upload.single('photo'), function(req,res){
  console.log(req.body.password)
  let details
  if(req.file){
    if(req.body.password){
      details = {
        name: req.body.name,
        email:req.body.email,
        phone:req.body.phone,
        photo:req.file.filename,
        password:bcrypt.hashSync(req.body.password, 10)
      }
    }else{
      details = {
        name: req.body.name,
        email:req.body.email,
        phone:req.body.phone,
        photo:req.file.filename,
      }
    }
  }else{
    if(req.body.password){
      details = {
        name: req.body.name,
        email:req.body.email,
        phone:req.body.phone,
        password:bcrypt.hashSync(req.body.password, 10)
      }
    }else{
      details = {
        name: req.body.name,
        email:req.body.email,
        phone:req.body.phone,
      }
    }
  }
  users.update({ _id: req.session.user._id }, { $set: details }, function (err, docs) {
    if(err){
      console.log(err)
    }else{
      users.findOne({_id:req.session.user._id},function(err,documents){
        if(err){
          console.log(err)
        }else{
          req.session.user = documents
          delete documents.password
          res.redirect('/profile')
        }
      })      
    }
  })
})

module.exports = router;