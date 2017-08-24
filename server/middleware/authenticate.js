var {User} = require('./../models/user');
var authenticate = (req, res, next) => {
    var token = req.header('x-auth');
    if(req.isAuthenticated()){
        User.findByToken(token).then((user) => {
            if (!user) {
                return Promise.reject();
            }
            
            req.user = user;
            req.token = token;
            next();
            
        }).catch((e) => {
            res.status(401).send('not auth'); // 401 authentication is required 
        });
    }
    
};
function isLoggedIn(req, res, next) {
    
        // if user is authenticated in the session, carry on 
        if (req.isAuthenticated())
            return next();
    
        // if they aren't redirect them to the home page
        res.redirect('/index');
};
module.exports = {authenticate, isLoggedIn};