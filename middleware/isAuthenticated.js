module.exports = (req, res, next) => {
  if (!req.session.userAuthenticated) {
    res.redirect('/login');
  }
  next();
};
