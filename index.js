var express = require('express');
var router = express.Router();
const monk = require('monk')
const db = monk('localhost:27017/dealup')
const adds = db.get('adds')
const users = db.get('users')
const multer = require('multer')
const path = require('path')
var nodemailer = require('nodemailer');
var randomstring = require("randomstring");
const bcrypt = require('bcrypt');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'srikanthammigo@gmail.com',
    pass: '9246692103'
  }
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})
var upload = multer({ storage: storage })

/* GET home page. */
router.get('/', function(req, res) {
  adds.find({},function(err,docs){
    if(err){
      console.log(err)
    }else{
      if(req.session && req.session.user){
        res.render('index',{isloggedin:true,docs:docs,modal:false});
      }else{
        res.render('index',{isloggedin:false,docs:docs,modal:false});
      }
    }
  })
});

/* GET add page */
router.get('/add',function(req,res){
  if(req.session && req.session.user){
    res.render('add',{modal:false,name:false})
  }else{
    res.redirect('/')
  }
})

/* POST add page */
router.post('/add',upload.single("photo"), function(req,res){
  let details = {
    category:req.body.category,
    name:req.body.name,
    price:req.body.price,
    condition:req.body.condition,
    description:req.body.description,
    location:req.body.location,
    photo:req.file.filename,
    phone:req.body.phone,
    isprivate:req.body.isprivate,
    ownerid:req.session.user._id,
    intrested:[]
  }
  adds.insert(details,function(err,docs){
    if(err){
      console.log(err)
    }else{
      res.render('add',{modal:true,name:docs.name})
    }
  })
})

/* POST search */
router.post('/search',function(req,res){
  console.log(req.body.search)
  let capital =  req.body.search.charAt(0).toUpperCase() + req.body.search.slice(1)
  adds.find({"category":capital},function(err,docs){
    if(err){
      console.log(err)
    }else if(!docs[0]){
      /* search for product */
      adds.find({"name":req.body.search},function(err,documents){
        if(err){
          console.log(err)
        }else{
          if(req.session && req.session.user){
            res.render('index',{isloggedin:true,docs:documents});
          }else{
            res.render('index',{isloggedin:false,docs:documents});
          }
        }
      })
    }else{
      if(req.session && req.session.user){
        res.render('index',{isloggedin:true,docs:docs});
      }else{
        res.render('index',{isloggedin:false,docs:docs});
      }
    }
  })
})

/* POST send mail */
router.post('/sendmail',function(req,res){

  users.findOne({_id:req.body.ownerid},function(err,docs){
    var mailOptions = {
      from: 'srikanthammigo@gmail.com',
      to: docs.email,
      subject: 'Someone intrested on your product',
      text:  `a person of name ${req.session.user.name} is intrested on your product please contact him ${req.session.user.phone}`
    };
    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
        res.redirect('/')
      } else {
        console.log('Email sent: ' + info.response);
        let intrested = req.session.user.intrested
        adds.findOne({"_id":req.body.productid},function(err,docs){
          if(err){
            console.log(err)
          }else if(docs){
            intrested.push(docs)
            users.update({_id:req.session.user._id},{$set:{intrested:intrested}},function(err,docs){
              if(err){
                console.log(err)
              }else{
                console.log(docs)
                req.session.user.intrested = intrested
                res.render('index',{isloggedin:true,modal:true,docs:[]})
              }
            })
          } 
        })
      }
    });
  })
})

router.get('/forget',function(req,res){
  res.render('forget')
})

router.post('/forget',function(req,res){
  let otp = randomstring.generate({
    length: 6,
    charset: 'numeric'
  });
  users.update({"email":req.body.email},{$set:{otp:otp}},function(err,docs){
    if(err){
      console.log(err)
    }else{
      var mailOptions = {
        from: 'srikanthammigo@gmail.com',
        to: req.body.email,
        subject: 'OTP for verification',
        text:  "your OTP is " + otp
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          res.redirect('/')
        } else {
          console.log('Email sent: ' + info.response);
          res.render('otp',{error:""})
        }
      });
    }
  })
})

router.post('/otp',function(req,res){
  users.findOne({otp:req.body.otp},function(err,docs){
    if(err){
      console.log(err)
    }else if(!docs){
      res.render('otp',{error:"invalid otp"})
    }else{
      res.render('confirm',{email:docs.email,error:""})
    }
  })
})

router.post('/updatepassword',function(req,res){
  if(req.body.password === req.body.cpassword){
    users.update({"email":req.body.email},{$set:{"password":bcrypt.hashSync(req.body.password, 10)}},function(err,docs){
      if(err){
        console.log(err)
      }else if(docs){
        res.redirect('/signup')
      }
    })
  }else{
    res.render('confirm',{error:"password and confirm password not matched",email:req.body.email})
  }
})

router.get('/delete/:id',function(req,res){
  adds.remove({"_id":req.params.id},(err,docs)=>{
    if(err){
        console.log(err)
    }else{
        res.redirect('/profile')
    }
})
})

/* GET product page */
router.get('/product/:id',function(req,res){
  if(req.session && req.session.user){
    let id = req.params.id
    adds.findOne({"_id":id},function(err,docs){
      if(err){
        console.log(err)
      }else{
        adds.find({"category":docs.category},function(err,documents){
          if(err){
            console.log(err)
          }
          let finaldocs = []
          for(var i = 0; i<documents.length; i++){
            id1 = documents[i]._id;
            id2 =  docs._id;
            if(!(id1.equals(id2))){
              finaldocs.push(documents[i])
            }
          }
          res.render('product',{docs:docs,documents:finaldocs})
        })
      }
    })    
  }else{
    res.redirect('/signup')
  }
  
})

/* GET according to category */
router.get('/:number',function(req,res){
  let number = parseInt(req.params.number)
  categories = ["Electronics","Mobiles","Home appliances","Vehicles","Books,Sports","Engineering stationery","Accessories","Others"]
  if(number <= categories.length){
    adds.find({"category":categories[number-1]},function(err,docs){
      if(err){
        console.log(err)
      }else{
        if(req.session && req.session.user){
          res.render('index',{isloggedin:true,docs:docs,modal:false});
        }else{
          res.render('index',{isloggedin:false,docs:docs,modal:false});
        }
      }
    })
  }else{
    res.redirect('/')
  }

})

module.exports = router;