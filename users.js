var express = require('express');
var router = express.Router();
const monk = require('monk')
const db = monk('localhost:27017/dealup')
const users = db.get('users')
const adds = db.get('adds')
const multer  = require('multer')
const path = require('path')
const bcrypt = require('bcrypt');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'srikanthammigo@gmail.com',
    pass: '9246692103'
  }
});

let storage = multer.diskStorage({
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
      let otp = randomstring.generate({
        length:6,
        charset:'numeric'
      })
      let details = {
        name:req.body.name,
        email:req.body.email,
        phone:req.body.phone,
        password:bcrypt.hashSync(req.body.password, 10),
        photo:req.file.filename,
        verify:otp,
        intrested:[]
      }

      users.insert(details,function(err,docs){
        if(err){
          console.log(err)
        }else{
          var mailOptions = {
            from: 'karthikenumarthi@gmail.com',
            to: req.body.email,
            subject: 'OTP For Verification',
            text:  `Your OTP to verify Account is ${otp} `
          };         
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
              res.redirect('/')
            } else {
              console.log('Email sent: ' + info.response);
              res.render('verifyemail',{error:""})     
            }
          });
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
    }    else if(!docs){
      res.render('signup',{error:"login unsuccessful, invalid mail or password"})
    }else if(docs.verify){
      let otp = randomstring.generate({
        length:6,
        charset:'numeric'
      })
      var mailOptions = {
        from: 'srikanthammigo@gmail.com',
        to: req.body.email,
        subject: 'OTP For Verification',
        text:  `Your OTP to verify Account is ${otp} `
      };         
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          res.redirect('/')
        } else {
          console.log('Email sent: ' + info.response);
          users.update({"email":req.body.email},{$set:{"verify":otp}},function(err,docs){
            if(err){
              console.log(err)
            }else{
              res.render('verifyemail',{error:""})
            }
          })
        }
      });
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
      photo:req.session.user.photo,
      intrested:req.session.user.intrested
    }
  res.set('Cache-Control','no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
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

/* VERIFY user email */
router.post('/verifyotp',function(req,res){
  users.findOne({verify:req.body.otp},function(err,docs){
    if(err){
      console.log(err)
    }else if(docs){
      users.update({"email":docs.email},{$set:{"verify":""}},function(err,documents){
        if(err){
          console.log(err)
        }else{
          req.session.user = docs
          delete docs.password
          res.redirect('/')
        }
      })
    }
  })
})
module.exports = router;