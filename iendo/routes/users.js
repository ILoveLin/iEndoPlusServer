var express = require('express');
var router = express.Router();
var db = require('../server');
// var co = require('co')
var co = require('co');
const { responseTool, repSuccess, repSuccessMsg, repError, repErrorMsg, repParamsErrorMsg } = require('../lib/responseData');
const { sql } = require('../server');



/*********************************************************************************用户登录*************************************************************************************/
/**
 * @api {post} /users/login 用户登录
 * @apiDescription 用户登录
 * @apiName login
 * @apiGroup User 
 * @apiParam {string} UserName 用户名
 * @apiParam {string} Password 密码
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 *  {
 *      "code" : "1",
 *      "data" : {
 *           "userID": userID,
 *           "Role": Role
 *      },
 *      "msg" : "请求成功",
 *  }
 * @apiSampleRequest http://localhost:3000/users/login
 * @apiVersion 1.0.0
 */
router.post('/users/login', function (req, res, next) {
  co(function* () {
    var mUserName = req.body.UserName;
    var mPassword = req.body.Password;
    try {
      // 校验数据
      let result = yield getCheckData(mUserName, mPassword);
      if (result.result == false) {
        res.send(responseTool({}, repError, result.msg))
      } else {
        let purview = yield __getPurview(result.userID)
        var data = {};
        if (purview) {
          data = { "userID": result.userID, "Role": result.role, "purview": purview};
        } else {
          data = { "userID": result.userID, "Role": result.role, "purview": {}};
        }
        res.send(responseTool(data, repSuccess, repSuccessMsg));
      }
    } catch (error) {
      res.send(responseTool({}, repError, '登录失败'))
    }
  });
});

// 检查账号密码
function getCheckData(mUserName,mPassword){
  return new Promise((resolve,reject)=>{
    var sqlString = `select u.UserID, u.Password, p.Role, u.CanUSE from  dbo.Purview p, dbo.users u where u.UserName='${mUserName}' and u.UserID = p.UserID;`;
    db.sql(sqlString, function (err, result) {
      if (err) {
        console.log("登录========== OK", err);
        reject(false);
        return;
      } else {
        let data = result['recordset']
        console.log("登录========== data", data);
        console.log("登录========== data[0]", data[0]["Password"]);
        console.log("登录========== mPassword", mPassword);
        var checkResult = {};
        if (data.length > 0) {
          // 校验密码是否正确
          console.log(mPassword == data[0]["Password"])
          if (mPassword == data[0]["Password"]) {
            let UserID = data[0]["UserID"]
            let Role = data[0]["Role"]
            if (data[0]["CanUSE"] == 1) {
              checkResult = {
                "result": true,
                "userID": UserID,
                "role": Role,
              }
            } else {
              checkResult = {
                "result": false,
                "msg": "账号未激活"
              }
            }
            // CanUSE
          } else {
            checkResult = {
              "result": false,
              "msg": "密码错误"
            }
          }
        } else {
          // 账号不存在
          checkResult = {
            "result": false,
            "msg": "账号不存在"
          }
        }
        resolve(checkResult);
        // if(mPassword==data[0]["Password"]){
        //   resolve(true);
        // }else{
        //   reject(false);
        // }
        // // responseTool(data, repSuccess, repSuccessMsg)
        
        // resolve(data);
      }
    });



  });


}

/**
 * @api {get} /users/purview 获取用户权限
 * @apiDescription 获取用户权限
 * @apiName purview
 * @apiGroup User 
 * @apiParam {string} UserID 用户ID
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 *  {
 *      "code" : "1",
 *      "data" : {
 *           "CanEdit": true,
 *      },
 *      "msg" : "请求成功",
 *  }
 * @apiSampleRequest http://localhost:3000/users/purview
 * @apiVersion 1.0.0
 */
 router.get('/users/purview', function (req, res, next) {
  co(function* () {
    try {
      var params = req.query || req.params;
      if (params.UserID == null) {
        res.send(responseTool({}, repError, '用户ID不能为空'))
      } else {
        let purview = yield __getPurview(params["UserID"])
        if (purview) {
          res.send(responseTool(purview, repSuccess, repSuccessMsg))
        } else {
          res.send(responseTool({}, repSuccess, repSuccessMsg))
        }
      }
    } catch (error) {
      res.send(responseTool({}, repError, repParamsErrorMsg))
    }
  });
});

function __getPurview(UserID) {
  return new Promise((resolve, result) => {
    var sqlString = `select * from Purview where UserID=${UserID};`;
    db.sql(sqlString, function (err, result) {
      if (err) {
        reject(false);
        return;
      } else {
        let data = result['recordset']
        // responseTool(data, repSuccess, repSuccessMsg)
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          resolve(null);
        }
      }
    });
  });
}

/*********************************************************************************修改自己的密码*************************************************************************************/
/**
 * @api {post} /users/changeMyselfPassword 修改密码
 * @apiDescription 修改密码
 * @apiName changePassword
 * @apiGroup User 
 * @apiParam {string} UserID 自己的ID
 * @apiParam {string} oldPassword 原来的密码
 * @apiParam {string} newPassword 原来的密码
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 *  {
 *      "code" : "1",
 *      "data" : {
 *          "data" : "data",
 *      },
 *      "msg" : "请求成功",
 *  }
 * @apiSampleRequest http://localhost:3000/users/changeMyselfPassword
 * @apiVersion 1.0.0
 */
router.post('/users/changeMyselfPassword', function (req, res, next) {
  co(function* () {
    try {
      var mUserID = req.body.UserID;
      var mOldPassword = req.body.oldPassword;
      var mNewPassword = req.body.newPassword;
      //查询原来密码是否正确
      var mOldPasswordStatue = yield getCurrentPasswordStatue(mUserID, mOldPassword);
      if (mOldPasswordStatue == mOldPassword) {
        //修改密码
        yield setNewPassword(mUserID, mNewPassword)
        res.send(responseTool({}, repSuccess, repSuccessMsg))
      } else {
        res.send(responseTool({}, repError, '原密码不正确'))
      }
    } catch {
      res.send(responseTool({}, repError, '参数错误'))
    }
  });

});


//查询原来密码是否正确
function getCurrentPasswordStatue(mUserID, mOldPassword) {
  return new Promise((resolve, result) => {
    console.log("查询原来密码是否正确=======开始查询");
    var sqlString = `select Password from  users where UserID=${mUserID};`;
    db.sql(sqlString, function (err, result) {
      if (err) {
        reject(false);
        console.log("查询原来密码是否正确=======DDD2222=== error", err);
        return;
      } else {
        let data = result['recordset']
        // responseTool(data, repSuccess, repSuccessMsg)
        if (data.length > 0) {
          data = data[0]['Password']
        }
        console.log("查询原来密码是否正确=======DDD2222=== OK", data);
        resolve(data);
      }
    });
  });

}

//修改密码
function setNewPassword(mUserID, mNewPassword) {
  return new Promise((resolve, reject) => {
    console.log("修改密码=======开始修改密码");
    var sqlString = `update dbo.users set Password='${mNewPassword}' where UserID=${mUserID}`;
    db.sql(sqlString, function (err, result) {
      if (err) {
        reject(false);
        console.log("修改密码==========失败", err);
        return;
      } else {
        let data = result['recordset']
        // responseTool(data, repSuccess, repSuccessMsg)
        console.log("修改密码========== OK", data);
        resolve(data);
      }
    });
  });
}


/*********************************************************************************修改其他人的密码*************************************************************************************/
/**
 * @api {post} /users/changeElsePassword 修改其他人的密码
 * @apiDescription 修改其他人的密码
 * @apiName changeElsePassword
 * @apiGroup User 
 * @apiParam {string} userID 自己的ID
 * @apiParam {string} changedUserID 被修改用户ID
 * @apiParam {string} userRelo 自己的权限
 * @apiParam {string} changedUserRelo 被修改用户的权限
 * @apiParam {string} changedPassword 新密码
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 *  {
 *      "code" : "1",
 *      "data" : {
 *          "data" : "data",
 *      },
 *      "msg" : "请求成功",
 *  }
 * @apiSampleRequest http://localhost:3000/users/changeElsePassword
 * @apiVersion 1.0.0
 */
router.post('/users/changeElsePassword', function (req, res, next) {
  co(function* () {
    /**
     * editor: jiangziwei
     * time: 2022-03-24 14:23
     */
    try {
      var mUserID = req.body.userID;
      var mChangedUserID = req.body.changedUserID;
      var mChangedPassword = req.body.changedPassword;
      if (parseInt(mChangedUserID) == 1) {
        // 超级管理员不能被修改
        res.send(responseTool({}, repError, "超级管理员密码无法修改"));
      } else {
        let purview = yield __getPurview(mUserID)
        let canChange = false
        if (purview.hasOwnProperty("CanPsw")) {
          canChange = purview["CanPsw"]
        }
        if (canChange) {
          //修改密码
          yield setNewPassword(mChangedUserID, mChangedPassword);
          res.send(responseTool({}, repSuccess, repSuccessMsg));
        } else {
          res.send(responseTool({}, repError, "当前账号无权限修改密码"));
        }
      }
    } catch {
      res.send(responseTool({}, repError, "参数错误"));
    }
  });
});


/* GET users listing. */
/*********************************************************************************用户列表数据*************************************************************************************/
/**
 * @api {get} /users/list 用户列表数据
 * @apiDescription 用户列表数据
 * @apiName list
 * @apiGroup User 
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 *  {
 *      "code" : "1",
 *      "data" : {
 *          "data" : "data",
 *      },
 *      "msg" : "请求成功",
 *  }
 * @apiSampleRequest http://localhost:3000/users/list
 * @apiVersion 1.0.0
 */
router.get('/users/list', function (req, res, next) {
  //获取参数 
  var sqlStr = 'select u.UserName, u.Des, u.CreatedAt, u.LastLoginAt, u.LoginTimes, p.* from dbo.users u, dbo.Purview p where u.UserID = p.UserID and u.CanUSE=1;';
  db.sql(sqlStr, function (err, result) {
    if (err) {
      res.send(responseTool({}, repError, repErrorMsg));
      return;
    } else {
      var data = result['recordset']
      // responseTool(data, repSuccess, repSuccessMsg)
      res.send(responseTool(data, repSuccess, repSuccessMsg))
    }
  });

});

/*********************************************************************************添加新用户*************************************************************************************/
/**
 * @api {post} /users/createUser 添加新用户
 * @apiDescription 添加新用户 
 * @apiName createUser
 * @apiGroup User 
 * @apiParam {string} UserID 当前用户ID
 * @apiParam {string} CurrentRelo 当前用户权限
 * @apiParam {string} CreateRelo 新用户的权限
 * @apiParam {string} UserName 新用户的名字
 * @apiParam {string} Password 新用户的密码
 * @apiParam {string} Des 新用户的描述
 * @apiParam {string} CanSUE 新用户是否激活1激活，0是未激活
 * 
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 *  {
 *      "code" : "1",
 *      "data" : {
 *          "data" : "data",
 *      },
 *      "msg" : "请求成功",
 *  }
 * @apiSampleRequest http://localhost:3000/users/createUser
 * @apiVersion 1.0.0
 */

router.post('/users/createUser', function (req, res, next) {
  co(function* () {
    // try {
      var UserID = req.body.UserID;
      var mCurrentRelo = req.body.CurrentRelo;
      var mCreateRelo = req.body.CreateRelo;
      var mUserName = req.body.UserName;
      var mPassword = req.body.Password;
      var mDes = req.body.Des;
      var mCanSUE = req.body.CanSUE;
      let purview = yield __getPurview(UserID)
      let canAdd = false
      if (purview.hasOwnProperty("UserMan")) {
        canAdd = purview["UserMan"]
      }
      if (canAdd) {
        // 查询UserName 是否符合唯一且不能是Admin
        let isExist = yield __queryUserWithUsername(mUserName)
        if (!isExist && mUserName.toLowerCase() !== "Admin".toLowerCase()) {
          // 添加用户表格
          yield createUser(mCreateRelo, mUserName, mPassword, mDes, mCanSUE);
          var createUserID = yield getCreateUserID(mUserName, mPassword);
          yield createUserWithPurview(parseInt(mCreateRelo), createUserID);
          res.send(responseTool({}, repSuccess, repSuccessMsg))
        } else {
          res.send(responseTool({}, repError, "用户名已存在"));
        }
      } else {
        res.send(responseTool({}, repError, "当前账号无权限添加账号"));
      }
    // } catch {
    //   res.send(responseTool({}, repError, "参数错误"));
    // }
  })

});
// 通过用户名查询用户是否存在
function __queryUserWithUsername(username) {
  return new Promise((resolve, reject) => {
    var sqlStr = `select * from users where UserName='${username}'`;
    db.sql(sqlStr, function (err, result) {
      if (err) {
        reject(false)
      } else {
        var data = result['recordset']
        if (data.length == 0) {
          resolve(false)
        } else {
          resolve(true)
        }
      }
    });
  })
}
// 添加用户表格
function createUser(mCreateRelo, mUserName, mPassword, mDes, mCanSUE) {
  return new Promise((resolve, reject) => {

    var sqlStr = `insert into users(UserName,Password,Des,CanUSE)values('${mUserName}','${mPassword}','${mDes}',${mCanSUE});`;
    console.log("添加用户表格===添加用户表格====sqlStr===111====" + sqlStr);

    db.sql(sqlStr, function (err, result) {
      if (err) {
        console.log("添加用户表格=======DDD2222=== 失败");
        reject(false)
      } else {
        var data = result['recordset']
        console.log("添加用户表格=======GGG2222=== 成功" + data);
        resolve(true)

      }
    });
  })
}

//获取刚刚创建用户的userID
function getCreateUserID(mUserName, mPassword) {
  return new Promise((resolve, reject) => {
    // select UserID FROM users where UserName = 'DDD'and Password='202cb962ac59075b964b07152d234b60';
    var sqlStr = `select UserID FROM users where UserName = '${mUserName}'and Password='${mPassword}';`;
    db.sql(sqlStr, function (err, result) {
      if (err) {
        console.log("获取刚刚创建用户的userID=======DDD2222=== 失败");
        reject(null)
      } else {
        console.log("获取刚刚创建用户的userID=======GGG2222=== 成功result====", result);
        let data = result['recordset']
        if (data.length > 0) {
          data = data[0]["UserID"];
        }
        console.log("获取刚刚创建用户的userID=======GGG2222=== 成功", data);
        resolve(data)
      }
    });

  })

}

//更新新用户的权限表格
function createUserWithPurview(mCreateRelo, createUserID) {
  return new Promise((resolve, reject) => {
    //1-管理员
    var sqlStr01 = `update  dbo.Purview set UserMan='1',CanPsw='1',CanNew='1',CanEdit='1',CanDelete='1',CanPrint='1',
    ReportStyle='1',DictsMan='1',GlossaryMan='1',TempletMan='1',HospitalInfo='1',CanBackup='1',ViewBackup='1',
    VideoSet='1',OnlySelf='0',UnPrinted='0',FtpSet='0',ChangeDepartment='1',ExportRecord='1',ExportImage='1',ExportVideo='1',
    DeviceSet='1',SeatAdjust='1',SnapVideoRecord='1',LiveStream='1',Role='0' where UserID =${createUserID};`

    //2-操作员
    var sqlStr02 = `update  dbo.Purview set UserMan='0',CanPsw='0',CanNew='1',CanEdit='1',CanDelete='1',CanPrint='1',
    ReportStyle='1',DictsMan='1',GlossaryMan='1',TempletMan='1',HospitalInfo='0',CanBackup='1',ViewBackup='1',
    VideoSet='0',OnlySelf='1',UnPrinted='0',FtpSet='0',ChangeDepartment='0',ExportRecord='0',ExportImage='0',ExportVideo='0',
    DeviceSet='0',SeatAdjust='0',SnapVideoRecord='0',LiveStream='0',Role='1' where UserID =${createUserID};`;

    //3-查询员
    var sqlStr03 = `update  dbo.Purview set UserMan='0',CanPsw='0',CanNew='0',CanEdit='0',CanDelete='0',CanPrint='1',
    ReportStyle='0',DictsMan='0',GlossaryMan='0',TempletMan='0',HospitalInfo='0',CanBackup='0',ViewBackup='1',
    VideoSet='0',OnlySelf='0',UnPrinted='0',FtpSet='0',ChangeDepartment='0',ExportRecord='0',ExportImage='0',ExportVideo='0',
    DeviceSet='0',SeatAdjust='0',SnapVideoRecord='0',LiveStream='0',Role='2' where UserID =${createUserID};`;

    console.log("权限相关==01====mCreateRelo=== ", mCreateRelo);
    var finalSql = ""
    //1-管理员，2-操作员，3-查询员
    if (0 == mCreateRelo) {
      finalSql = sqlStr01
    } else if (1 == mCreateRelo) {
      finalSql = sqlStr02
    } else {
      finalSql = sqlStr03
    }
    db.sql(finalSql, function (err, result) {
      if (err) {
        console.log("权限相关==01======== ", err);
        reject(false)
        return;
      } else {
        console.log("权限相关==01======== ", result);
        resolve(true);
      }
    });
  })

}


/*********************************************************************************删除用户*************************************************************************************/
/**
 * @api {post} /users/deleteUserById 删除用户
 * @apiDescription 删除用户
 * @apiName deleteUserById
 * @apiGroup User 
 * @apiParam {string} DeleteUserID 被修改用户ID
 * @apiParam {string} CurrentUserID 当前用户ID
 * @apiParam {string} CurrentRelo 当前权限
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 *  {
 *      "code" : "1",
 *      "data" : {
 *          "data" : "data",
 *      },
 *      "msg" : "请求成功",
 *  }
 * @apiSampleRequest http://localhost:3000/users/deleteUserById
 * @apiVersion 1.0.0
 */
router.post('/users/deleteUserById', function (req, res, next) {
  co(function* () {
    try {
      /**
       * 1. 超级管理员不能删除
       * 2. 自己不能删除自己
       * 3. 有用户管理权限就可以删除
       */
      var mCurrentUserID = req.body.CurrentUserID;
      var mDeleteUserID = req.body.DeleteUserID;
      var nCurrentRelo = req.body.CurrentRelo;
      if (parseInt(mDeleteUserID) == 1) {
        res.send(responseTool({}, repError, '超级管理员不能被删除'))
      } else {
        if (parseInt(mCurrentUserID) == parseInt(mDeleteUserID)) {
          res.send(responseTool({}, repError, '当前登录为此用户，不能删除'))
        } else {
          let purview = yield __getPurview(mCurrentUserID)
          let canDelete = false
          if (purview.hasOwnProperty("UserMan")) {
            canDelete = purview["UserMan"]
          }
          if (canDelete) {
            //删除用户
            var deleteStatue = yield deleteUserById(mDeleteUserID)
            //删除用户所关联的权限表格 
            var deleteStatueWithPurview = yield deleteUserByIdWithPurview(mDeleteUserID)
            res.send(responseTool({}, repSuccess, repSuccessMsg))
          } else {
            res.send(responseTool({}, repError, '当前账号无权限删除用户'))
          }
        }
      }
    } catch (error) {
      res.send(responseTool({}, repError, "参数错误"))
    }

  })

})


// 删除用户
function deleteUserById(mDeleteUserID) {
  return new Promise((resolve, reject) => {
    var sqlStr = `delete from dbo.users where UserID=${mDeleteUserID};`;
    db.sql(sqlStr, function (err, result) {
      if (err) {
        reject(false)
      } else {
        var data = result['recordset']
        console.log("我的测试=======删除用户===" + data);
        resolve(true)
      }
    })
  })
}
// 删除用户--所关联的权限表格

function deleteUserByIdWithPurview(mDeleteUserID) {
  return new Promise((resolve, reject) => {
    var sqlStr = `delete from dbo.Purview where UserID=${mDeleteUserID};`;
    db.sql(sqlStr, function (err, result) {
      if (err) {
        reject(false)
      } else {
        var data = result['recordset']
        console.log("我的测试=======删除用户===" + data);
        resolve(true)
      }
    })
  })
}

/*********************************************************************************修改权限*************************************************************************************/
/**
 *修改权限
 * params:
 * 必填：当前用户UserID,UserName,被修改用户ChangeUserID，Relo 需要被修改的用户权限等级// 0超级管理员 1管理员  2操作员 3 查询员
 */

/**
* @api {post} /users/changePurview 修改权限
* @apiDescription 
* 修改权限
* @apiName changePurview
* @apiGroup User 
* @apiParam {string} CurrentUserID 当前登入的用户ID
* @apiParam {string} ChangeUserID 需要被修改权限的用户ID
* @apiParam {string} UserName 当前登入的用户名字
* @apiParam {string}  Relo 需要被修改的用户权限等级
* @apiSuccess {json} result
* @apiSuccessExample {json} Success-Response:
*  {
*      "code" : "1",
*      "data" : {
*          "data" : "data",
*      },
*      "msg" : "请求成功",
*  }
* @apiSampleRequest http://localhost:3000/users/changePurview
* @apiVersion 1.0.0
*/
router.post('/users/changePurview', function (req, res, nest) {
  co(function* () {
    try {
      var CurrentUserID = req.body.CurrentUserID
      var ChangeUserID = req.body.ChangeUserID
      var CurrentUserName = req.body.UserName
      var Relo = req.body.Relo
      /**
      * 1. 超级管理员不能修改
      * 2. 有用户管理权限就可以修改
      */
      if (parseInt(ChangeUserID) == 1) {
        res.send(responseTool({}, repError, '超级管理员不能修改'))
      } else {
        let purview = yield __getPurview(CurrentUserID)
        let canEdit = false
        if (purview.hasOwnProperty("UserMan")) {
          canEdit = purview["UserMan"]
        }
        if (canEdit) {
          yield createUserWithPurview(parseInt(Relo), ChangeUserID);
          res.send(responseTool({}, repSuccess, repSuccessMsg))
        } else {
          res.send(responseTool({}, repError, '当前账号无权限修改用户角色'))
        }
      }
    } catch (error) {
      res.send(responseTool({}, repError, "参数错误"))
    }
  })
});

module.exports = router;
