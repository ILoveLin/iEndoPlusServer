const { app } = require('express');
var mssql = require('mssql');

var db = {};
var config = {
  user: 'sa',
  password: 'LzJDzh19861207',
  server: '127.0.0.1', 
  database: 'cme_endo',
  port:1433,
  options: {
    encrypt: false // Use this if you're on Windows Azure
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 3000
  }
};

db.sql = function (sql, callBack) {
  console.log("sql", sql)
  var connection = new mssql.ConnectionPool(config, function (err) {
    if (err) {
      console.log('+++', err);
      return;
    }
    var ps = new mssql.PreparedStatement(connection);
    ps.prepare(sql, function (err) {
      if (err){
        console.log(err);
        callBack(err, null);
        return;
      }
      ps.execute('', function (err, result) {
        if (err){
          console.log(err);
          callBack(err, null);
          return;
        }
 
        ps.unprepare(function (err) {
          if (err){
            console.log(err);
            callback(err,null);
            return;
          }
            callBack(err, result);
        });
      });
    });
  });
};
 
module.exports = db;