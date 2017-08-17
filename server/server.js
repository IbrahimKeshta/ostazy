require('./config/config');
const _ = require('lodash');
const { ObjectID } = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');
var { mongoose } = require('./db/mongoose');
var { Subjects } = require('./models/subjects');
var { User } = require('./models/user');
var {authenticate} = require('./middleware/authenticate');
var { Facebookid } = require('./models/facebookid');


var app = express();
var port = process.env.PORT;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// Post
app.post('/subjects', authenticate, (req, res) => {
    var subject = new Subjects({
        title: req.body.title,
        field: req.body.field,
        ytLink: req.body.ytLink,
        document: req.body.document,
        _creator: req.user._id
    });
    subject.save().then((doc) => {
        res.send(doc);
    }, (e) => {
        res.status(400).send(e);
    });
});

// GET all subjects
app.get('/subjects', authenticate, (req, res) => {
    Subjects.find({
        _creator: req.user._id
    }).then((subjects) => {
        res.send({ subjects })
    }, (e) => {
        res.status(400).send(e);
    });
});

// GET /subjects/123432
app.get('/subjects/:id', authenticate, (req, res) => {
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
        res.status(200).send({ subject });
    }).catch((e) => {
        return res.status(400).send();
    });
});

// DELETE route /subjects/1234

app.delete('/subjects/:id', authenticate, (req, res) => {
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
        res.send({ subject }); //return object 
        //error
        //404 with empty body
    }).catch((e) => {
        return res.status(400).send();
    });
});


// UPDATE route
app.patch('/subjects/:id', authenticate, (req, res) => {
    var id = req.params.id;
    var body = _.pick(req.body, ['title', 'field', 'ytLink', 'document']); //_.pick(Object, [proprties]) 


    if (!ObjectID.isValid(id)) {
        return res.status(404).send('Not Valid ID');
    }
    // find and update subject text and completed
    Subjects.findOneAndUpdate({_id: id, _creator: req.user._id}, { $set: body }, { new: true }).then((subject) => {
        if (!subject) {
            return res.status(404).send();
        }
        res.send({ subject });

    }).catch((e) => {
        res.status(400).send();
    })
});

// USER Route
// POST /users
//signup route
app.post('/users', (req, res) => {
    var body = _.pick(req.body, ['email', 'password']);
    var user = new User(body);

    user.save().then(() => {
        return user.generateAuthToken();
    }).then((token) => {
        res.header('x-auth', token).send(user);
    }).catch((e) => {
        res.status(400).send(e);
    });
});



// login route private route
app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});

// POST /users/login {email, password}
app.post('/users/login', (req, res) => {
 var body = _.pick(req.body, ['email', 'password']);
 var user = new User(body);

 User.findByCredentials(body.email,body.password).then((user) => {
    user.generateAuthToken().then((token) => {
        res.header('x-auth', token).send(user);
    });
 }).catch((e) => {
    res.status(400).send();
 });
});

// DELETE User route - logout
app.delete('/users/me/token', authenticate, (req, res) =>{
    req.user.removeToken(req.token).then(() => {
         res.status(200).send();
    }, () => {
        res.status(400).send();
    });
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
        res.send(subjects);
    }).catch((e) => {
        res.status(400).send();
    });
});

// GET subjects of story lectures 
app.get('/lectures/story', (req, res) => {
    Subjects.find({
        field: "story"
    }).then((subjects) => {
        res.send(subjects);
    }).catch((e) => {
        res.status(400).send();
    });
});

// GET subjects of exercises lectures 
app.get('/lectures/exercises', (req, res) => {
    Subjects.find({
        field: "exercises"
    }).then((subjects) => {
        res.send(subjects);
    }).catch((e) => {
        res.status(400).send();
    });
});
app.listen(port, () => {
    console.log(`started on port ${port}`);
});

module.exports = { app };

 