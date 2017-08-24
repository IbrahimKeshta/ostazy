require('./config/config');

const _ = require('lodash');
const { ObjectID } = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');
var passport = require('passport');
var flash = require('connect-flash');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var ejs = require('ejs');
var yturl = require('video-url-inspector');
var { mongoose } = require('./db/mongoose');
var { Subjects } = require('./models/subjects');
var { User } = require('./models/user');
var {authenticate, isLoggedIn} = require('./middleware/authenticate');
var { Facebookid } = require('./models/facebookid');


var app = express();
var port = process.env.PORT;

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use( function( req, res, next ) {
    // this middleware will call for each requested
    // and we checked for the requested query properties
    // if _method was existed
    // then we know, clients need to call DELETE request instead
    if ( req.query._method == 'DELETE' ) {
        // change the original METHOD
        // into DELETE method
        req.method = 'DELETE';
        // and set requested url to /user/12
        req.url = req.path;
    } else if( req.query._method == 'PATCH') {
        req.method = 'PATCH';
        req.url = req.path;
    }
    next(); 
});
app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); 
app.use(passport.initialize());
app.use(passport.session()); 
app.use(flash());
require('./config/passport')(passport);

app.get('/index', (req, res) => {
    res.render('pages/index');
})
app.get('/', isLoggedIn, (req, res) => {
  res.render('pages/home',{ user: req.user});
});

app.get('/about', isLoggedIn,(req, res) => {
    res.render('pages/about', {message: req.flash('subMessage')});
});

app.get('/subjects', isLoggedIn, (req, res) => {
    res.render('pages/addsubject',  {message: req.flash('addMessage')});
});
// Post
app.post('/subjects', isLoggedIn, (req, res) => {
    if(!req.body.title || !req.body.field || !req.body.ytLink || !req.body.document){
        req.flash('addMessage','please complete all fields')
       return  res.redirect('/subjects');
    }
    if(yturl(req.body.ytLink) === null) {
        req.flash('addMessage','youtube link should be a URL')
        return res.redirect('/subjects');        
    }
    var subject = new Subjects({
        title: req.body.title,
        field: req.body.field,
        ytLink: yturl(req.body.ytLink).embedUrl,
        document: req.body.document,
        _creator: req.user._id
    });
    console.log(yturl(req.body.ytLink).embedUrl);
    subject.save().then((doc) => {
        req.flash('singleMessage', 'subject created');
        res.redirect(`/subjects/${doc._id}`);
    }, (e) => {
        res.status(400).send(e);
    });
});

// GET all subjects
app.get('/allsubjects', isLoggedIn, (req, res) => {
    Subjects.find({
        _creator: req.user._id
    }).then((subjects) => {
        subjects.reverse();
        res.render('pages/allsubjects', { subjects: subjects , message: req.flash('deleteMessage')});
    }, (e) => {
        res.status(400).send(e);
    });
});

// GET /subjects/123432
app.get('/subjects/:id', isLoggedIn, (req, res) => {
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    Subjects.findOne({
        _id: id,
        _creator: req.user._id
    }).then((subject) => {
        if (!subject) {
            return res.status(404).send();
        }
        res.status(200).render('pages/singlesubject',{ subject: subject , message: req.flash('singleMessage')});
    }).catch((e) => {
        return res.status(400).send();
    });
});

// DELETE route /subjects/1234

app.delete('/delsubjects/:id', isLoggedIn, (req, res) => {
    var id = req.params.id;

    //validate id -> not valid? return 404
    if (!ObjectID.isValid(id)) {
        return res.status(404).send('Not Valid ID');
    }
    //remove subject by id
    //success
    // if no doc, send 404
    // if doc send doc back
    Subjects.findOneAndRemove({
        _id: id,
        _creator: req.user._id
    }).then((subject) => {
        if (!subject) {
            return res.status(404).send();
        }
        req.flash('deleteMessage', 'subject deleted');
        res.redirect('/allsubjects'); //return object 
        //error
        //404 with empty body
    }).catch((e) => {
        return res.status(400).send();
    });
});

app.get('/editsubjects/:id', isLoggedIn, (req, res) => {
    var id = req.params.id;
    var body = _.pick(req.body, ['title', 'field', 'ytLink', 'document']); //_.pick(Object, [proprties]) 
    
    if (!ObjectID.isValid(id)) {
        return res.status(404).send('Not Valid ID');
    }
    Subjects.findOne({
        _id: id,
        _creator: req.user._id
    }).then((subject) => {
        if (!subject) {
            return res.status(404).send();
        }
        res.render('pages/editsubject',{ subject: subject , message: req.flash('editMessage') });

    }).catch((e) => {
        res.status(400).send();
    });
});

// UPDATE route
app.post('/editsubjects/:id', isLoggedIn, (req, res) => {
    var id = req.params.id;
    if(!req.body.title || !req.body.field || !req.body.ytLink || !req.body.document){
        req.flash('editMessage','please complete all fields');
        return res.redirect(`/editsubjects/${id}`);
        // return res.render('pages/editsubject', {subject: req.body});
    }
    var body = _.pick(req.body, ['title', 'field', 'ytLink', 'document']); //_.pick(Object, [proprties]) 
    if(yturl(req.body.ytLink) === null) {
        req.flash('editMessage','youtube link should be a URL');
        req.flash('singleMessage', 'Subject edited');
        return res.redirect(`/editsubjects/${id}`);        
    }
    body.ytLink = (yturl(body.ytLink)).embedUrl;

    if (!ObjectID.isValid(id)) {
        return res.status(404).send('Not Valid ID');
    }
    // find and update subject text and completed
    Subjects.findOneAndUpdate({_id: id, _creator: req.user._id}, { $set: body }, { new: true }).then((subject) => {
        if (!subject) {
            return res.status(404).send();
        }
        req.flash('singleMessage','Subject edited');
        res.redirect(`/subjects/${id}`);

    }).catch((e) => {
        res.status(400).send();
    });
});

// USER Route
// POST /users
//signup route
app.get('/users', (req, res) => {
    res.render('pages/signup', { message: req.flash('signupMessage') });
});
// app.post('/users', (req, res) => {
//     var body = _.pick(req.body, ['email', 'password']);
//     var user = new User(body);

//     user.save().then(() => {
//         return user.generateAuthToken();
//     }).then((token) => {
//         res.header('x-auth', token).send(user);
//     }).catch((e) => {
//         res.status(400).send(e);
//     });
// });

app.post('/users', passport.authenticate('local-signup', {
    successRedirect : '/users/me',
    failureRedirect : '/users',
    failureFlash: true
}));

app.get('/users/me', (req, res) => {
    // res.send(req.user);
    res.render('pages/profile.ejs', {
        user : req.user // get the user out of session and pass to template
    })
});


// login route private route
//GET /users/login 
app.get('/users/login', (req, res) => {
    res.render('pages/login', { message : req.flash('loginMessage')});
});

// POST /users/login {email, password}
// app.post('/users/login', (req, res) => {
//  var body = _.pick(req.body, ['email', 'password']);
//  var user = new User(body);

//  User.findByCredentials(body.email,body.password).then((user) => {
//     user.generateAuthToken().then((token) => {
//         res.header('x-auth', token).redirect('/');
//     });
//  }).catch((e) => {
//     res.status(400).send();
//  });
// });

app.post('/users/login', passport.authenticate('local-login', {
    successRedirect : '/users/me',
    failureRedirect : '/users/login',
    failureFlash: true
}));

// DELETE User route - logout
// app.delete('/users/me/token', authenticate, (req, res) =>{
//     req.user.removeToken(req.token).then(() => {
//          res.status(200).redirect('/');
//     }, () => {
//         res.status(400).send();
//     });
// });

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/index');
});
// POST Facebook userId 
app.post('/fb', (req, res) => {
    var fid = req.body.fbid;
    var fbuser = new Facebookid({
        userid: fid
    });
    Facebookid.findOne({userid: fid}).then((user) => {
        if(!user){
            fbuser.save().then((user) => {
                res.redirect('/lectures');
            });
        } else {
            return res.status(200).redirect('/lectures');
        }
        
    }).catch((e) => {
        res.status(400).send();
    });
});

// public GET subjects for all
app.get('/lectures', (req, res) => {
    Subjects.find().then((subjects) => {
        if(!subjects){
            res.status(400).send();
        }
        subjects.reverse();
        res.send({subjects});
    }).catch((e) => {
        res.status(400).send();
    })
});
// GET subjects of grammar lectures 
app.get('/lectures/grammar', (req, res) => {
    Subjects.find({
        field: "grammar"
    }).then((subjects) => {
        subjects.reverse();
        res.send({subjects});
    }).catch((e) => {
        res.status(400).send();
    });
});

// GET subjects of story lectures 
app.get('/lectures/story', (req, res) => {
    Subjects.find({
        field: "story"
    }).then((subjects) => {
        subjects.reverse();
        res.send({subjects});
    }).catch((e) => {
        res.status(400).send();
    });
});

// GET subjects of exercises lectures 
app.get('/lectures/exercises', (req, res) => {
    Subjects.find({
        field: "exercises"
    }).then((subjects) => {
        subjects.reverse();
        res.send({subjects});
    }).catch((e) => {
        res.status(400).send();
    });
});


app.listen(port, () => {
    console.log(`started on port ${port}`);
});

module.exports = { app };

 