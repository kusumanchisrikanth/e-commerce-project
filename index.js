var express = require('express');
var router = express.Router();
const monk = require('monk')
const db = monk('localhost:27017/dealup')
const adds = db.get('adds')
const multer = require('multer')
const path = require('path')

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
        res.render('index',{isloggedin:true,docs:docs});
      }else{
        res.render('index',{isloggedin:false,docs:docs});
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
    username:req.session.user.name,
    email:req.session.user.email
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
          res.render('index',{isloggedin:true,docs:docs});
        }else{
          res.render('index',{isloggedin:false,docs:docs});
        }
      }
    })
  }else{
    res.redirect('/')
  }

})


module.exports = router;