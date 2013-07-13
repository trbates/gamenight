require(__dirname + '/models/event.js');
require(__dirname + '/models/user.js');
require(__dirname + '/models/logintoken.js');

var express = require('express'),
    app = express(),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Event = mongoose.model('Event'),
    Invitation = mongoose.model('Invitation'),
    LoginToken = mongoose.model('LoginToken'),
    helpers = require('./helpers.js');


var ObjectId = mongoose.Types.ObjectId;
var flash = require('connect-flash');
mongoose.connect('mongodb://localhost/game-night');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.cookieSession({ key: 'sid', secret: '[top-secret-here]' }));
    app.use(flash());
});


function authenticateFromLoginToken(req, res, next) {
  var cookie = JSON.parse(req.cookies.logintoken);

  LoginToken.findOne({ email: cookie.email,
                       series: cookie.series,
                       token: cookie.token }, (function(err, token) {
    if (!token) {
      res.redirect('/login');
      return;
    }

    User.findOne({ email: token.email }, function(err, user) {
      if (user) {
        req.session.user_id = user.id;
        req.currentUser = user;

        token.token = token.randomToken();
        token.save(function() {
          res.cookie('logintoken', token.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
          next();
        });
      } else {
        res.redirect('/login');
      }
    });
  }));
};

function loadUser(req, res, next) { 
    if (req.session && req.session.user_id) {
        User.findById(req.session.user_id, function (err, user) {
            if (user) {
                req.currentUser = user;
                next();
            } else {
                res.redirect('/login');
            }
        });
    } else if (req.cookies && req.cookies.logintoken) {
        authenticateFromLoginToken(req, res, next);
    } else { 
        res.redirect('/login');
    }
};

app.get('/', loadUser, function (req, res) {
    res.redirect('/events');
});

app.get('/login', function (req, res) {
    res.render('sessions/login.jade', {
        user: new User()
    });
});

app.get('/logout', loadUser, function (req, res) {
    if (req.session) {
        LoginToken.remove({ email: req.currentUser.email }, function () { });
        res.clearCookie('logintoken');
        delete req.session.user_id;
    }
    res.redirect('/login');
});

app.post('/login', function (req, res) { 
    //authenticate
    User.findOne({ email: req.body.user.email }, function(err, user) {
        if (user && user.authenticate(req.body.user.password)) {
          req.session.user_id = user.id;

          // Remember me
          if (req.body.remember_me) {
            var loginToken = new LoginToken({ email: user.email });
            loginToken.save(function() {
              res.cookie('logintoken', loginToken.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
              res.redirect('/events');
            });
          } else {
            res.redirect('/events');
          }
        } else {
          req.flash('error','Incorrect credentials');
          res.redirect('/login');
        }
      }); 
});

app.get('/signup', function (req, res) {
    res.render('users/signup', {
        user: new User(),
        info: req.flash('info')
    });
});

app.post('/users', function (req, res) {
    var user = new User(req.body.user);
    user.save(function (err) {
        if (err) {
            res.render('users/signup', { user: user, errors: ['Account creation failed.', err] });
        }
        else {
            req.flash('info', 'Your account has been created');
            req.session.user_id = user.id;
            res.redirect('/events');
        }
    });
});

app.get('/event/new', loadUser, function (req, res) {
    res.render('events/new', {
        event: new Event()
    });
});

app.post('/event/new', loadUser, function (req, res) {
    var event = new Event(req.body.event);
    event.user = req.currentUser.id;
    event.save(function (err) {
        if (err) {
            res.render('/event/new', { event: event, errors: ['Event creation failed.', err] });
        } else {
            req.flash('info', 'Event has been created.');
            res.redirect('/events');
        }
    });
});

app.get('/events/:id', loadUser, function (req, res) {
    Event.findOne({ _id: req.params.id }, function (err, eventObj) {
        if (eventObj) {
            Invitation.find({ event: eventObj._id }, function (errs, invites) { 
                console.log(eventObj);
                res.render('events/show', {
                    title: eventObj.title,
                    event: eventObj,
                    invitations: invites
                });
            });
            
        } else {
            res.send(404);
        }
    });
});

app.get('/events/edit/:id', loadUser, function (req, res) {
    Event.findOne({ _id: req.params.id }, function (err, eventObj) {
        if (eventObj) {
            Invitation.find({ event: eventObj._id }, function (errs, invites) { 
                res.render('events/edit', {
                    event: eventObj,
                    invitations: invites
                });
            });

        } else {
            res.send(404);
        }
    });
});

app.post('/events/edit/:id', loadUser, function (req, res) {
    console.log(req.body);
    var eventData = req.body.event;
    var updateData = {
        title: eventData.title,
        when: eventData.when,
        where: eventData.where,
        description: eventData.description
    };
    Event.update({ _id: req.params.id }, updateData, function (err, numAffected) {
        if (err) { throw err; }
        res.redirect('/events');
    });
});

app.get('/events', loadUser, function (req, res) {
    Event.find({ user: req.currentUser.id }, function (err, events) {
        res.render('events/index', {
            events: events, user: req.currentUser
        });
    });
});

app.get('/events/:id/invitations', loadUser, function (req, res) { 
    Invitation.find({ event: req.params.id }, function (err, result) {
        if (result) {
            res.json(result);
        } else {
            res.send(404);
        }
    });
});

app.delete('/events/:id/invitations', loadUser, function (req, res) { 
    var invitations = req.body.invitations;
    for(var i = 0; i < invitations.length; i++) {
        Invitation.remove({
            event: invitations[i].event,
            email: Invitation[i].email
        }).exec();
    }
    res.send(200);
});

app.post('/events/:id/invitations', loadUser, function(req, res) {
    var upsertData = {
        event: req.params.id,
        name: req.body.name,
        email: req.body.email
    };
    Invitation.update({event: req.params.id, email: req.body.email }, upsertData, { upsert: true }, function(err, numberAffected, rawResponse) {
        if(err) {
            throw err;
        } else {
            Invitation.find({ event: req.params.id }, function (err, result) {
                if (result) {
                    res.json(result);
                }
            });
        }
    });
});


app.listen(process.env.port || 8080);