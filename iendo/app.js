var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs')
var ini = require('ini')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var caseRouter = require('./routes/case');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 加载设备图片和视频静态文件
var config = ini.parse(fs.readFileSync('./deviceConfig.ini', 'utf-8'));
app.use(express.static(config.root.imagesPath));
app.use(express.static(config.root.videosPath));
app.use(express.static(config.root.logoPath));

app.use('/', indexRouter);
app.use('/', usersRouter);
app.use('/', caseRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
process.env.PORT = config.root.httpPort;

module.exports = app;
