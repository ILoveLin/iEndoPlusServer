var express = require('express');
var router = express.Router();
var db = require('../server');
var moment = require('moment');
var co = require('co');
const fs = require('fs');
var path = require('path');
var ini = require('ini');
const multer = require('multer');
const upload = multer({ dest: 'public/images/logo' })
const { validateJson, caseSchema, caseInfoSchema, caseSearchSchema, caseHospitalSchema, caseReportSearchSchema, selectImagesSchema, caseInfoDeleteSchema } = require('../lib/schema');
const { responseTool, repSuccess, repSuccessMsg, repError, repNoCaseInfoErrorMsg, repParamsErrorMsg } = require('../lib/responseData');
/* GET users listing. */

// #region 病例列表
/**
 * @api {get} /case/list 1.1 病例列表
 * @apiDescription 病例列表
 * @apiName list
 * @apiGroup 病例（Case）
 * @apiParam {string} EndoType 工作站类型
 * @apiParam {string} [datetime]（YYYY-MM-DD） 日期
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": [{case},{case}],
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/list?datetime=2021-09-09
 * @apiVersion 1.0.0
 */
// #endregion
router.get('/case/list', function (req, res, next) {
    var param = req.query || req.params;
    const caselistSchema = {
        type: "object",
        properties: {
            datetime: { type: "string" }, // 日期
            EndoType: { type: "string" }, // 工作站类型
        },
        required: ["EndoType"],
        additionalProperties: false,
    }
    console.log(param)
    const schemaResult = validateJson(caselistSchema, param)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    // 默认取当天时间
    // var datetime = 
    var nowDate = moment()
    var tomoDate = moment().add(1, "days")
    if (param.hasOwnProperty('datetime')) {
        console.log('时间是否合法', moment(param['datetime'], "YYYY-MM-DD").isValid())
        if (!moment(param['datetime'], "YYYY-MM-DD").isValid()) {
            res.send(responseTool({}, repError, repParamsErrorMsg));
        }
        nowDate = moment(param['datetime'], "YYYY-MM-DD");
        tomoDate = moment(param['datetime'], "YYYY-MM-DD").add(1, "days");
    }
    var sqlStr = `select 
    convert(varchar(100), CheckDate, 120) check_date, 
    convert(varchar(100), RecordDate, 120) record_date, 
    convert(varchar(100), UpdateTime, 120) update_time, 
    rb.*, 
    rec.ExaminingPhysician, rec.ClinicalDiagnosis, rec.CheckContent, rec.CheckDiagnosis
    from 
    dbo.record_base rb, 
    dbo.record_endoscopy_check rec 
    where 
    rb.RecordDate between '${nowDate.format("YYYY-MM-DD")}' and '${tomoDate.format("YYYY-MM-DD")}' 
    and rb.ID = rec.ID and EndoType=${param.EndoType};`
    db.sql(sqlStr, function (err, result) {
        if (err) {
            res.send(responseTool({}, repError, repParamsErrorMsg));
            return
        }
        res.send(responseTool(result['recordset'], repSuccess, repSuccessMsg, result['recordset'].length==0?{isEmpty: true}: {isEmpty: false}));
    });
});


// #region 病例搜索
/**
 * @api {get} /case/search 1.2 病例搜索
 * @apiDescription 病例搜索</br></br><text style="color:#EA0000">特别说明：如果某个字段查询全部或不进行筛选有两种传值方式</br>1. 不传该字段</br>2. 传 “全部”</text>
 * @apiName search
 * @apiGroup 病例（Case）
 * @apiParam {string} EndoType 工作站类型
 * @apiParam {string} [CheckDateStart] 检查日期开始 （YYYY-MM-DD）
 * @apiParam {string} [CheckDateEnd] 检查日期结束 （YYYY-MM-DD）
 * @apiParam {string} [CaseNo] 检查号
 * @apiParam {int} [ReturnVisit] 初复诊 （0-初诊 1-复诊）
 * @apiParam {string} [Name] 姓名
 * @apiParam {string} [Sex] 性别 （男，女）
 * @apiParam {int} [PatientAgeStart] 患者年龄开始
 * @apiParam {int} [PatientAgeEnd] 患者年龄结束
 * @apiParam {string} [AgeUnit] 年龄单位 （岁，月，天）
 * @apiParam {string} [Married] 婚否 （已婚，未婚）
 * @apiParam {string} [InpatientID] 住院号
 * @apiParam {string} [BedID] 病床号
 * @apiParam {string} [WardID] 病区号
 * @apiParam {string} [Department] 科室
 * @apiParam {string} [ExaminingPhysician] 检查医生
 * @apiParam {string} [SubmitDoctor] 申请医生
 * @apiParam {string} [CaseID] 病历号
 * @apiParam {string} [InsuranceID] 社保卡ID
 * @apiParam {string} [Occupatior] 职业
 * @apiParam {string} [Device] 设备
 * @apiParam {string} [CheckContent] 检查内容（镜检所见）
 * @apiParam {string} [CheckDiagnosis] 镜检诊断
 * @apiParam {string} [Advice] 建议
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": [{case},{case}],
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/search?CheckDateStart=2021-09-09&CheckDateEnd=2021-09-14
 * @apiVersion 1.0.0 
*/
// #endregion
router.get('/case/search', function (req, res, next) {
    var params = req.query || req.params
    const schemaResult = validateJson(caseSearchSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    var caseSearchObj = {
        CheckDateStart: params.CheckDateStart,
        CheckDateEnd: params.CheckDateEnd,
        CaseNo: params.CaseNo,
        ReturnVisit: params.ReturnVisit,
        Name: params.Name,
        Sex: params.Sex,
        PatientAgeStart: params.PatientAgeStart,
        PatientAgeEnd: params.PatientAgeEnd,
        AgeUnit: params.AgeUnit,
        Married: params.Married,
        InpatientID: params.InpatientID,
        BedID: params.BedID,
        WardID: params.WardID,
        Department: params.Department,
        ExaminingPhysician: params.ExaminingPhysician,
        SubmitDoctor: params.SubmitDoctor,
        CaseID: params.CaseID,
        InsuranceID: params.InsuranceID,
        Occupatior: params.Occupatior,
        Device: params.Device,
        CheckContent: params.CheckContent,
        CheckDiagnosis: params.CheckDiagnosis,
        Advice: params.Advice,
    }
    var condiStr = ""
    for (key in caseSearchObj) {
        if (caseSearchObj[key] == null) {
            continue
        } else {
            // 性别和婚否为全部时，不加入搜索条件
            if (caseSearchObj[key] == "全部" && (key == "Sex" || key == "Married")) {
                continue
            }
            // 属于范围搜索，单独处理
            if (key == "CheckDateStart") {
                if (!moment(caseSearchObj[key], "YYYY-MM-DD").isValid()) {
                    res.send(responseTool({}, repError, "CheckDateStart is not vaild"));
                }
                condiStr += `rb.CheckDate >= '${caseSearchObj[key]}' and `
            } else if (key == "CheckDateEnd") {
                if (!moment(caseSearchObj[key], "YYYY-MM-DD").isValid()) {
                    res.send(responseTool({}, repError, "CheckDateEnd is not vaild"));
                }
                // 结束时间包括当天的，所以需要往后推一天
                var tomoDate = moment(caseSearchObj[key], "YYYY-MM-DD")
                tomoDate = tomoDate.add(1, "days");
                condiStr += `rb.CheckDate <= '${tomoDate.format('YYYY-MM-DD')}' and `
            } else if (key == "PatientAgeStart") {
                condiStr += `rb.patientAge >= ${caseSearchObj[key]} and `
            } else if (key == "PatientAgeEnd") {
                condiStr += `rb.patientAge <= ${caseSearchObj[key]} and `
            } else if (key == "ExaminingPhysician" || key == "CheckContent" || key == "CheckDiagnosis") {
                // 处理 record_endoscopy_check 表 筛选条件
                condiStr += `rec.${key} like '%${caseSearchObj[key]}%' and `
            } else {
                // 处理 record_base 表 筛选条件
                condiStr += `rb.${key} like '%${caseSearchObj[key]}%' and `
            }
        }
    }
    condiStr += "rb.ID = rec.ID"
    var sqlStr = `select 
    convert(varchar(100), CheckDate, 120) check_date, 
    convert(varchar(100), RecordDate, 120) record_date, 
    convert(varchar(100), UpdateTime, 120) update_time, 
    rb.*, 
    rec.ExaminingPhysician, rec.ClinicalDiagnosis, rec.CheckContent, rec.CheckDiagnosis
    from 
    dbo.record_base rb, 
    dbo.record_endoscopy_check rec 
    where ${condiStr} and EndoType=${params.EndoType};`
    db.sql(sqlStr, function (err, result) {
        if (err) {
            res.send(responseTool({}, repError, repParamsErrorMsg));
            return
        }
        res.send(responseTool(result['recordset'], repSuccess, repSuccessMsg));
    });
});


// #region 病例数据字典
/**
 * @api {get} /case/listDicts 1.4 病例数据字典
 * @apiDescription 病例数据字典
 * @apiName listDicts
 * @apiGroup 病例（Case）
 * @apiParam {string} [EndoType] 工作站类型
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": [{dic},{dic}],
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/listDicts
 * @apiVersion 1.0.0
 */
// #endregion
router.get('/case/listDicts', function (req, res, next) {
    co(function* () {
        try {
            var params = req.query || req.params
            var listDicts = yield __getListDicts(params['EndoType'])
            res.send(responseTool({ "listDicts": listDicts }, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }

    })
});


// #region 新增病例
/**
 * @api {post} /case/add 1.5 新增病例
 * @apiDescription 新增病例
 * @apiName add
 * @apiGroup 病例（Case）
 * @apiParam {string} Name 姓名
 * @apiParam {string} UserName 操作员用户名
 * @apiParam {string} UserID 用户ID
 * @apiParam {int} EndoType 工作站类型
 * @apiParam {string} [Married] 婚否 （已婚，未婚）
 * @apiParam {string} [Sex] 性别 （男，女）
 * @apiParam {string} [Tel] 电话
 * @apiParam {string} [Address] 住址
 * @apiParam {string} [PatientNo] 病人编号
 * @apiParam {string} [CardID] 身份证号
 * @apiParam {string} [MedHistory] 医疗病史
 * @apiParam {string} [FamilyHistory] 家族病史
 * @apiParam {string} [Race] 民族种族
 * @apiParam {string} [Occupatior] 职业
 * @apiParam {string} [InsuranceID] 社保卡ID
 * @apiParam {string} [NativePlace] 籍贯
 * @apiParam {string} [IsInHospital] 是否还在医院住院
 * @apiParam {string} [LastCheckUserID] 最后一个来查房的医生
 * @apiParam {string} [DOB] 生日
 * @apiParam {int} [PatientAge] 患者年龄
 * @apiParam {string} [AgeUnit] 年龄单位 （岁，月，天）
 * @apiParam {int} [ReturnVisit] 初复诊 （0-初诊 1-复诊）
 * @apiParam {string} [BedID] 病床号
 * @apiParam {string} [WardID] 病区号
 * @apiParam {string} [CaseID] 病历号
 * @apiParam {string} [SubmitDoctor] 申请医生
 * @apiParam {string} [Department] 科室
 * @apiParam {string} [Device] 设备
 * @apiParam {string} [Fee] 收费
 * @apiParam {string} [FeeType] 收费类型
 * @apiParam {string} [ChiefComplaint] 主诉
 * @apiParam {string} [Test] 试验
 * @apiParam {string} [Advice] 建议
 * @apiParam {string} [InpatientID] 住院号
 * @apiParam {string} [OutpatientID] 门诊号
 * @apiParam {string} [Others] 其他
 * @apiParam {string} [Await1] 待定1
 * @apiParam {string} [Await2] 待定2
 * @apiParam {string} [Await3] 待定3
 * @apiParam {string} [Await4] 待定4
 * @apiParam {string} [Await5] 待定5
 * @apiParam {string} [Biopsy] 活检
 * @apiParam {string} [Ctology] 细胞学
 * @apiParam {string} [Pathology] 病理学
 * @apiParam {string} [ExaminingPhysician] 检查医生
 * @apiParam {string} [ClinicalDiagnosis] 临床诊断
 * @apiParam {string} [CheckContent] 检查内容（镜检所见）
 * @apiParam {string} [CheckDiagnosis] 镜检诊断
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {"ID":ID},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/add
 * @apiVersion 1.0.0
 */
// #endregion
router.post('/case/add', function (req, res, next) {
    var params = req.body;
    // 获取新增病例的
    console.log(params)
    const schemaResult = validateJson(caseSchema('add'), params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    var caseObj = {
        // RecordType: "endoscopy_check",
        PatientID: 0,
        Name: params.Name,
        Married: params.Married,
        Sex: params.Sex,
        Tel: params.Tel,
        Address: params.Address,
        PatientNo: params.PatientNo,
        CardID: params.CardID,
        MedHistory: params.MedHistory,
        FamilyHistory: params.FamilyHistory,
        Race: params.Race,
        Occupatior: params.Occupatior,
        InsuranceID: params.InsuranceID,
        NativePlace: params.NativePlace,
        IsInHospital: params.IsInHospital,
        LastCheckUserID: params.LastCheckUserID,
        DOB: params.DOB,
        PatientAge: params.PatientAge,
        AgeUnit: params.AgeUnit,
        // CaseNo: params.CaseNo,
        ReturnVisit: params.ReturnVisit,
        BedID: params.BedID,
        WardID: params.WardID,
        CaseID: params.CaseID,
        SubmitDoctor: params.SubmitDoctor,
        Department: params.Department,
        Device: params.Device,
        Fee: params.Fee,
        FeeType: params.FeeType,
        ChiefComplaint: params.ChiefComplaint,
        Test: params.Test,
        Advice: params.Advice,
        InpatientID: params.InpatientID,
        OutpatientID: params.OutpatientID,
        Others: params.Others,
        Await1: params.Await1,
        Await2: params.Await2,
        Await3: params.Await3,
        Await4: params.Await4,
        Await5: params.Await5,
        Biopsy: params.Biopsy,
        Ctology: params.Ctology,
        Pathology: params.Pathology,
        UserName: params.UserName,
        EndoType: params.EndoType,
    }
    // 判断工作站类型
    const inEndo = [1,2,3,4,5,6,7,8,9,10,11]
    const outEndo = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114]
    if (inEndo.indexOf(Number(params["EndoType"]))) {
        caseObj["RecordType"] = "endoscopy_check";
    } else if (outEndo.indexOf(Number(params["EndoType"]))) {
        caseObj["RecordType"] = "endoscopy_surgery";
    }
    // 添加年龄单位默认值
    if (params["AgeUnit"] == "" || params["AgeUnit"] == null) {
        caseObj["AgeUnit"] = "岁"
    }
    var caseCheckObj = {
        ExaminingPhysician: params.ExaminingPhysician,
        ClinicalDiagnosis: params.ClinicalDiagnosis,
        CheckContent: params.CheckContent,
        CheckDiagnosis: params.CheckDiagnosis
    }
    co(function* () {
        try {
            // 先判断是否有权限
            var canOperation =  yield __canOperation("CanNew", params.UserID)
            if (!canOperation) {
                res.send(responseTool({}, repError, "当前账号无操作权限"))
                return;
            }
            // 获取病历编号
            var caseNo = yield __getCaseNoReq(params.EndoType);
            caseObj["CaseNo"] = caseNo;
            // 新增 record_base
            const ID = yield __addCase(caseObj);
            if (ID == null) {
                res.send(responseTool({}, repError, repParamsErrorMsg))
            } else {
                // 新增 record_endoscopy_check
                const result = yield __addCaseCheck(ID, caseCheckObj);
                // 插入记录
                yield __logRecord(generateLogObj(params.UserID, params.UserName, "新增病例", `病例ID: ${ID}`, params.EndoType))
                if (result) {
                    res.send(responseTool({"ID": ID}, repSuccess, repSuccessMsg))
                } else {
                    res.send(responseTool({}, repError, repParamsErrorMsg))
                }
            }
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })
});


// #region 修改病例
/**
 * @api {post} /case/update 1.6 修改病例
 * @apiDescription 修改病例
 * @apiName update
 * @apiGroup 病例（Case）
 * @apiParam {int} ID 内部ID
 * @apiParam {string} CaseNo 病历编号
 * @apiParam {string} UserName 操作员用户名
 * @apiParam {int} EndoType 工作站类型
 * @apiParam {string} UserID 用户ID
 * @apiParam {string} [Name] 姓名
 * @apiParam {string} [Married] 婚否 （已婚，未婚）
 * @apiParam {string} [Sex] 性别 （男，女）
 * @apiParam {string} [Tel] 电话
 * @apiParam {string} [Address] 住址
 * @apiParam {string} [PatientNo] 病人编号
 * @apiParam {string} [CardID] 身份证号
 * @apiParam {string} [MedHistory] 医疗病史
 * @apiParam {string} [FamilyHistory] 家族病史
 * @apiParam {string} [Race] 民族种族
 * @apiParam {string} [Occupatior] 职业
 * @apiParam {string} [InsuranceID] 社保卡ID
 * @apiParam {string} [NativePlace] 籍贯
 * @apiParam {string} [IsInHospital] 是否还在医院住院
 * @apiParam {string} [LastCheckUserID] 最后一个来查房的医生
 * @apiParam {string} [DOB] 生日
 * @apiParam {int} [PatientAge] 患者年龄
 * @apiParam {string} [AgeUnit] 年龄单位 （岁，月，天）
 * @apiParam {int} [ReturnVisit] 初复诊 （0-初诊 1-复诊）
 * @apiParam {string} [BedID] 病床号
 * @apiParam {string} [WardID] 病区号
 * @apiParam {string} [CaseID] 病历号
 * @apiParam {string} [SubmitDoctor] 申请医生
 * @apiParam {string} [Department] 科室
 * @apiParam {string} [Device] 设备
 * @apiParam {string} [Fee] 收费
 * @apiParam {string} [FeeType] 收费类型
 * @apiParam {string} [ChiefComplaint] 主诉
 * @apiParam {string} [Test] 试验
 * @apiParam {string} [Advice] 建议
 * @apiParam {string} [InpatientID] 住院号
 * @apiParam {string} [OutpatientID] 门诊号
 * @apiParam {string} [Others] 其他
 * @apiParam {string} [Await1] 待定1
 * @apiParam {string} [Await2] 待定2
 * @apiParam {string} [Await3] 待定3
 * @apiParam {string} [Await4] 待定4
 * @apiParam {string} [Await5] 待定5
 * @apiParam {string} [Biopsy] 活检
 * @apiParam {string} [Ctology] 细胞学
 * @apiParam {string} [Pathology] 病理学
 * @apiParam {string} [ExaminingPhysician] 检查医生
 * @apiParam {string} [ClinicalDiagnosis] 临床诊断
 * @apiParam {string} [CheckContent] 检查内容（镜检所见）
 * @apiParam {string} [CheckDiagnosis] 镜检诊断
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/update
 * @apiVersion 1.0.0
 */
// #endregion
router.post('/case/update', function (req, res, next) {
    var params = req.body;
    const schemaResult = validateJson(caseSchema('update'), params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    var caseObj = {
        PatientID: 0,
        Name: params.Name,
        Married: params.Married,
        Sex: params.Sex,
        Tel: params.Tel,
        Address: params.Address,
        PatientNo: params.PatientNo,
        CardID: params.CardID,
        MedHistory: params.MedHistory,
        FamilyHistory: params.FamilyHistory,
        Race: params.Race,
        Occupatior: params.Occupatior,
        InsuranceID: params.InsuranceID,
        NativePlace: params.NativePlace,
        IsInHospital: params.IsInHospital,
        LastCheckUserID: params.LastCheckUserID,
        DOB: params.DOB,
        PatientAge: params.PatientAge,
        AgeUnit: params.AgeUnit,
        CaseNo: params.CaseNo,
        ReturnVisit: params.ReturnVisit,
        BedID: params.BedID,
        WardID: params.WardID,
        CaseID: params.CaseID,
        SubmitDoctor: params.SubmitDoctor,
        Department: params.Department,
        Device: params.Device,
        Fee: params.Fee,
        FeeType: params.FeeType,
        ChiefComplaint: params.ChiefComplaint,
        Test: params.Test,
        Advice: params.Advice,
        InpatientID: params.InpatientID,
        OutpatientID: params.OutpatientID,
        Others: params.Others,
        Await1: params.Await1,
        Await2: params.Await2,
        Await3: params.Await3,
        Await4: params.Await4,
        Await5: params.Await5,
        Biopsy: params.Biopsy,
        Ctology: params.Ctology,
        Pathology: params.Pathology,
        UserName: params.UserName,
        EndoType: params.EndoType,
    }
    // 判断工作站类型
    if (Number(params["EndoType"]) == 3) {
        caseObj["RecordType"] = "endoscopy_check";
    }
    var caseCheckObj = {
        ExaminingPhysician: params.ExaminingPhysician,
        ClinicalDiagnosis: params.ClinicalDiagnosis,
        CheckContent: params.CheckContent,
        CheckDiagnosis: params.CheckDiagnosis
    }
    co(function* () {
        try {
            // 先判断是否有权限
            var canOperation =  yield __canOperation("CanEdit", params.UserID)
            if (!canOperation) {
                res.send(responseTool({}, repError, "当前账号无操作权限"))
                return;
            }
            // 更新 record_base
            yield __updateCase(params["ID"], caseObj);
            if (params.ExaminingPhysician != null || params.ClinicalDiagnosis != null || params.CheckContent != null || params.CheckDiagnosis != null) {
                // 更新 record_endoscopy_check
                yield __updateCaseCheck(params["ID"], caseCheckObj)
            }
            // 插入记录
            yield __logRecord(generateLogObj(params.UserID, params.UserName, "修改病例", `病例ID: ${params["ID"]}`, params.EndoType))
            res.send(responseTool({}, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })
});


// #region 删除病例
/**
 * @api {post} /case/delete 1.7 删除病例
 * @apiDescription 删除病例
 * @apiName delete
 * @apiGroup 病例（Case）
 * @apiParam {int} ID 内部ID
 * @apiParam {string} UserName 操作员用户名
 * @apiParam {int} EndoType 工作站类型
 * @apiParam {string} UserID 用户ID
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/delete?ID=10
 * @apiVersion 1.0.0
 */
// #endregion
router.post('/case/delete', function (req, res, next) {
    var params = req.body
    const schemaResult = validateJson(caseInfoDeleteSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    co(function* () {
        try {
            // 先判断是否有权限
            var canOperation =  yield __canOperation("CanDelete", params.UserID)
            if (!canOperation) {
                res.send(responseTool({}, repError, "当前账号无操作权限"))
                return;
            }
            // 从 record_base 中删除
            yield __deleteCaseByID(params["ID"]);
            // 从 record_endoscopy_check 中删除
            yield __deleteCaseCheckByID(params["ID"]);
            // 插入记录
            yield __logRecord(generateLogObj(params.UserID, params.UserName, "删除病例", `病例ID: ${params["ID"]}`, params.EndoType))
            res.send(responseTool({}, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })
});


// #region 病例详细信息
/**
 * @api {get} /case/caseInfo 1.8 病例详细信息
 * @apiDescription 病例详细信息
 * @apiName caseInfo
 * @apiGroup 病例（Case）
 * @apiParam {int} ID 内部ID
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {case},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/caseInfo?ID=10
 * @apiVersion 1.0.0
 */
// #endregion
router.get('/case/caseInfo', function (req, res, next) {
    var params = req.query || req.params
    const schemaResult = validateJson(caseInfoSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    co(function* () {
        try {
            // 查询病例信息
            var caseInfo = yield __getCaseInfo(params["ID"]);
            if (caseInfo == null) {
                res.send(responseTool({}, repError, repNoCaseInfoErrorMsg))
            }
            // // 查询图片和视频数量
            let count = yield __getImagesAndVideosCount(params["ID"]);
            var data = {
                ...count,
                ...caseInfo
            }
            res.send(responseTool(data, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })
});


// #region 病例图片
/**
 * @api {get} /case/caseimages 1.9 病例图片
 * @apiDescription 病例图片
 * @apiName caseimages
 * @apiGroup 病例（Case）
 * @apiParam {int} ID 内部ID
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": [{image}],
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/caseimages?ID=10
 * @apiVersion 1.0.0
 */
// #endregion
router.get('/case/caseImages', function (req, res, next) {
    var params = req.query || req.params
    const schemaResult = validateJson(caseInfoSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    co(function* () {
        try {
            // 查询图片
            let images = yield __getImages(params["ID"]);
            var data = images;
            res.send(responseTool(data, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })
});


// #region 病例视频
/**
 * @api {get} /case/casevideos 1.9 病例视频
 * @apiDescription 病例视频
 * @apiName casevideos
 * @apiGroup 病例（Case）
 * @apiParam {int} ID 内部ID
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": [{video}],
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/casevideos?ID=10
 * @apiVersion 1.0.0
 */
// #endregion
router.get('/case/casevideos', function (req, res, next) {
    var params = req.query || req.params
    const schemaResult = validateJson(caseInfoSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    co(function* () {
        try {
            // 查询视频
            let videos = yield __getVideos(params["ID"]);
            var data = videos;
            res.send(responseTool(data, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })
});


// #region 查询报告医院信息
/**
 * @api {get} /case/hospitalInfo 2.0 查询报告医院信息
 * @apiDescription 查询报告医院信息
 * @apiName hospitalInfo
 * @apiGroup 病例（Case）
 * @apiParam {string} [EndoType] 工作站类型
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {dict},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/hospitalInfo
 * @apiVersion 1.0.0
 */
// #endregion
router.get('/case/hospitalInfo', function (req, res, next) {
    co(function* () {
        try {
            var params = req.query || req.params 
            var hospitalInfos = yield __getHospitalInfo(params['EndoType'])
            var data = {
                ...hospitalInfos,
                'szIconPath': 'DefaultLogo.jpg',
            }
            res.send(responseTool(data, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }

    })
});


// #region 修改报告医院信息
/**
 * @api {post} /case/updateHospitalInfo 2.1 修改报告医院信息
 * @apiDescription 修改报告医院信息
 * @apiName updateHospitalInfo
 * @apiGroup 病例（Case）
 * @apiParam {int} ID 内部ID
 * @apiParam {string} UserName 操作员用户名
 * @apiParam {int} EndoType 工作站类型
 * @apiParam {string} UserID 用户ID
 * @apiParam {string} [szHospital] 主标题
 * @apiParam {string} [szSlave] 副标题
 * @apiParam {string} [szAddress] 地址
 * @apiParam {int} [szTelephone] 联系方式
 * @apiParam {string} [szPostCode] 邮编
 * @apiParam {string} [szTitle] 软件标题
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": [],
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/updateHospitalInfo
 * @apiVersion 1.0.0
 */
// #endregion
router.post('/case/updateHospitalInfo', function (req, res, next) {
    var params = req.body
    const schemaResult = validateJson(caseHospitalSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    var caseHospitalObj = {
        szHospital: params.szHospital,
        szSlave: params.szSlave,
        szAddress: params.szAddress,
        szTelephone: params.szTelephone,
        szPostCode: params.szPostCode,
        szTitle: params.szTitle,
    }
    co(function* () {
        try {
            // 更新 reginfo
            yield __updateCaseHospital(params["ID"], caseHospitalObj);
            // 插入记录
            yield __logRecord(generateLogObj(params.UserID, params.UserName, "修改医院信息", `医院信息ID: ${params["ID"]}`, params.EndoType))
            res.send(responseTool({}, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })
})


// #region 上传医院徽标
/**
 * @api {post} /case/uploadHospitalLogo 2.2 上传医院徽标
 * @apiDescription 上传医院徽标</br></br><text style="color:#EA0000">特别说明：Content-Type:formData </br>接口测试 参数 body/form-data</text>
 * @apiName uploadHospitalLogo
 * @apiGroup 病例（Case）
 * @apiParam {File} logo 上传的图片
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/case/uploadHospitalLogo
 * @apiVersion 1.0.0
 */
// #endregion
router.post('/case/uploadHospitalLogo', upload.single('logo'), function (req, res, next) {
    console.log(req.file);
    try {
        fs.readFile(req.file.path, (err, data) => {
            // 校验是否上传成功
            if (err) { return res.send(responseTool({}, repError, '上传失败')) }
            // 加载设备图片和视频静态文件
            var config = ini.parse(fs.readFileSync('././deviceConfig.ini', 'utf-8'));
            let filename = 'DefaultLogo.jpg'
            let logofilePath = path.join(config.root.logoPath, filename)
            fs.writeFile(logofilePath, data, (err) => {
                if (err) { return res.send(responseTool({}, repError, '写入失败')) };
                res.send(responseTool({}, repSuccess, repSuccessMsg))
            })
        })
    } catch (error) {
        res.send(responseTool({}, repError, "上传失败"))
    }
})


// #region 报告搜索
/**
 * @api {post} /report.aspx 2.3 报告搜索 (用于微信小程序) 
 * @apiDescription 报告搜索</br></br><text style="color:#EA0000">特别说明：OutpatientID、CardID、InsuranceID 三选一必传, 另外两个传空字符串或不传</text>
 * @apiName searchReport
 * @apiGroup 病例（Case）
 * @apiParam {string} Name 姓名
 * @apiParam {string} Sex 性别 （男，女）
 * @apiParam {string} [OutpatientID] 门诊号
 * @apiParam {string} [CardID] 身份证号
 * @apiParam {string} [InsuranceID] 社保卡ID
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": [{case},{case}],
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/report.aspx?Name=xxx&Sex=xx
 * @apiVersion 1.0.0 
*/
// #endregion
router.post('/report.aspx', function (req, res, next) {
    var params = req.body
    const schemaResult = validateJson(caseReportSearchSchema, params)
    if (!schemaResult.result) {
        res.send("-1")
        // res.status(400).json(schemaResult.errors)
        return;
    }
    if (params.OutpatientID==null && params.CardID==null && params.InsuranceID==null) {
        res.send("-1")
        return;
    }
    var caseSearchObj = {
        Name: params.Name,
        Sex: params.Sex,
        OutpatientID: params.OutpatientID ? params.OutpatientID : "",
        CardID: params.CardID ? params.CardID : "",
        InsuranceID: params.InsuranceID ? params.InsuranceID : "",
    }
    var condiStr = ""
    for (key in caseSearchObj) {
        if (caseSearchObj[key] == null || caseSearchObj[key] === "") {
            continue
        } else {
            condiStr += `rb.${key}='${caseSearchObj[key]}' and `
        }
    }
    condiStr += "rb.ID = rec.ID"
    var sqlStr = `select
    rb.*, 
    rec.ExaminingPhysician, rec.ClinicalDiagnosis, rec.CheckContent, rec.CheckDiagnosis
    from 
    dbo.record_base rb, 
    dbo.record_endoscopy_check rec 
    where ${condiStr};`
    db.sql(sqlStr, function (err, result) {
        if (err) {
            res.send("-1");
            return
        }
        if (result['recordset'].length > 0) {
            var data = result['recordset'].map(row => {
                row.CheckDate = moment(row.CheckDate).utc().format("YYYY-MM-DD HH:mm:ss")
                row.RecordDate = moment(row.RecordDate).utc().format("YYYY-MM-DD HH:mm:ss")
                return row;
            });
            res.send({"ds":data})
        } else {
            res.send("-1")
        }
    });
})


// #region 报告图片选择
/**
 * @api {post} /report/selectImages 2.4 报告图片选择 (用于打印报告) 
 * @apiDescription 报告图片选择
 * @apiName selectImages
 * @apiGroup 病例（Case）
 * @apiParam {string} CaseID 病例ID
 * @apiParam {string} oldImageIDs 修改前图片ID字符串，最多选择9张图片，多个图片ID用 英文的',' 分割, 例子：230,220,245
 * @apiParam {string} newImageIDs 修改后图片ID字符串，同上
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/selectImages
 * @apiVersion 1.0.0 
*/
// #endregion
router.post('/report/selectImages', function(req, res, next) {
    var params = req.body
    const schemaResult = validateJson(selectImagesSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    let CaseID = params.CaseID;
    var oldImageIDs = params.oldImageIDs;
    var newImageIDs = params.newImageIDs;
    if (newImageIDs.split(",").length > 9) {
        res.send(responseTool({}, repError, "最多选择9张图片"))
        return;
    }
    var newImageIDStr = newImageIDs.split(',').join(';');
    newImageIDStr += ";";
    co(function* () {
        try {
            // 更新 recode_base images
            yield __updateCaseInfoImages(CaseID, newImageIDStr);
            // 更新 images_of_record 选中状态
            yield __updateImageSelect(oldImageIDs, newImageIDs);
            res.send(responseTool({}, repSuccess, repSuccessMsg));
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg));
        }
    })
})

// #region 查询服务端是否已经生成报告
/**
 * @api {get} /report/reportExists 2.5 查询服务端是否已经生成报告 
 * @apiDescription 查询服务端是否已经生成报告
 * @apiName reportExists
 * @apiGroup 病例（Case）
 * @apiParam {string} ID 病例ID
 * @apiSuccess {json} result
 * @apiSuccessExample {json} Success-Response:
 * {
 *      "code": 0,
 *      "data": {"exists": true, "url": "xxx.bmp"},
 *      "msg": ""
 * }
 * @apiSampleRequest http://localhost:3000/reportExists
 * @apiVersion 1.0.0 
*/
// #endregion
router.get('/report/reportExists', function(req, res, next) {
    var params = req.query || req.params
    const schemaResult = validateJson(caseInfoSchema, params)
    if (!schemaResult.result) {
        res.send(responseTool({}, repError, JSON.stringify(schemaResult.errors)))
        // res.status(400).json(schemaResult.errors)
        return;
    }
    co(function* () {
        try {
            // 查询是否已经生成病理报告
            let url = yield __isExistsReport(params["ID"]);
            var data = {
                "exists": false,
                "url": ""
            };
            if (url) {
                data = {
                  "exists": true,
                  "url": `${params["ID"]}/Report/${url}`
                }
            }
            res.send(responseTool(data, repSuccess, repSuccessMsg))
        } catch (error) {
            res.send(responseTool({}, repError, repParamsErrorMsg))
        }
    })

})


// Private Function
// 查询当前用户是否有操作权限
function __canOperation(action, UserID) {
    return new Promise((resolve, reject) => {
        var sqlStr = `select * from dbo.Purview where UserID = ${UserID};`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            let records = result['recordset']
            if (records.length > 0) {
                var purviewModel = records[0];
                if (purviewModel.hasOwnProperty(action)) {
                    resolve(purviewModel[action] == 1)
                } else {
                    resolve(false)
                }
                
            } else {
                resolve(false)
            }
        });
    })
}
// 新增时获取病例编号
function __getNextCaseNo(caseNo) {
    if (caseNo == null) {
        // 数据库中没有病例记录
        return moment().format('YYYYMMDD') + '1';
    } else {
        var index = -1
        for (let i = caseNo.length - 1; i >= 0; i--) {
            if (isNaN(Number(caseNo.charAt(i)))) {
                break
            }
            index = i
        }
        if (index == -1) {
            // 最后一位都不是数字
            return caseNo + '1'
        } else {
            // 从最后一位到index-1位都是数字
            var pre = caseNo.substring(0, index)
            var suf = Number(caseNo.substring(index, caseNo.length)) + 1
            return pre + suf.toString()
        }
    }
}
// 获取病例编号
function __getCaseNoReq(endo_type) {
    return new Promise((resolve, reject) => {
        var sqlStr = `select * from dbo.record_base where ID in (select max(ID) from dbo.record_base where EndoType=${endo_type});`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            let records = result['recordset']
            if (records.length > 0) {
                resolve(__getNextCaseNo(records[0]['CaseNo']))
            } else {
                resolve(null)
            }
        });
    })
}
// 获取病例字典
function __getListDicts(endoType) {
    return new Promise((resolve, reject) => {
        var sqlStr = ""
        if (endoType == null) {
            sqlStr = `select * from dbo.ListDicts;`
        } else {
            sqlStr = `select * from dbo.ListDicts where EndoType=${endoType};`
        }
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            let records = result['recordset']
            console.log(records)
            resolve(records)
        });
    })
}
// 新增病例基本信息
function __addCase(caseObj) {
    return new Promise((resolve, reject) => {
        var valueStr = ""
        for (key in caseObj) {
            if (caseObj[key] == null) {
                if (key == 'IsInHospital') {
                    valueStr += "0,"
                } else if (key == 'AgeUnit') {
                    valueStr += `'岁',`
                } else {
                    valueStr += `'',`
                }
            } else if (typeof caseObj[key] === 'string') {
                valueStr += "'" + caseObj[key] + "',"
            } else {
                valueStr += caseObj[key] + ","
            }
        }
        valueStr = valueStr.substr(0, valueStr.length - 1);
        var sqlStr = `insert into dbo.record_base(${Object.keys(caseObj).join(',')}) output inserted.ID values(${valueStr});`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            let records = result['recordset']
            if (records.length > 0) {
                resolve(records[0]["ID"])
            } else {
                resolve(null)
            }
        });
    })
}
// 新增诊断信息
function __addCaseCheck(ID, caseCheckObj) {
    return new Promise((resolve, reject) => {
        caseCheckObj["ID"] = ID
        var valueStr = ""
        for (key in caseCheckObj) {
            if (caseCheckObj[key] == null) {
                valueStr += `'',`
            } else if (typeof caseCheckObj[key] === 'string') {
                valueStr += "'" + caseCheckObj[key] + "',"
            } else {
                valueStr += caseCheckObj[key] + ","
            }
        }
        valueStr = valueStr.substr(0, valueStr.length - 1);
        var sqlStr = `insert into dbo.record_endoscopy_check(${Object.keys(caseCheckObj).join(',')}) values(${valueStr});`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    })
}
// 更新病例基本信息
function __updateCase(ID, caseObj) {
    return new Promise((resolve, reject) => {
        var valueStr = ""
        for (key in caseObj) {
            if (caseObj[key] == null) {
                continue
            } else if (typeof caseObj[key] === 'string') {
                valueStr += `${key}='${caseObj[key]}',`
            } else {
                valueStr += `${key}=${caseObj[key]},`
            }
        }
        valueStr += `UpdateTime='${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}'`;
        var sqlStr = `update dbo.record_base set ${valueStr} where ID=${ID};`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    })
}
// 更新病例诊断信息
function __updateCaseCheck(ID, caseCheckObj) {
    return new Promise((resolve, reject) => {
        var valueStr = ""
        for (key in caseCheckObj) {
            if (caseCheckObj[key] == null) {
                continue
            } else if (typeof caseCheckObj[key] === 'string') {
                valueStr += `${key}='${caseCheckObj[key]}',`
            } else {
                valueStr += `${key}=${caseCheckObj[key]},`
            }
        }
        valueStr = valueStr.substr(0, valueStr.length - 1);
        var sqlStr = `update dbo.record_endoscopy_check set ${valueStr} where ID=${ID};`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    })
}
// 删除病例基本信息
function __deleteCaseByID(ID) {
    return new Promise((resolve, reject) => {
        var sqlStr = `delete from dbo.record_base where ID=${ID};`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    })
}
// 删除病例检查信息
function __deleteCaseCheckByID(ID) {
    return new Promise((resolve, reject) => {
        var sqlStr = `delete from dbo.record_endoscopy_check where ID=${ID};`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    })
}
// 获取病例详情
function __getCaseInfo(caseID) {
    return new Promise((resolve, reject) => {
        var sqlStr = `select 
        convert(varchar(100), CheckDate, 120) check_date, 
        convert(varchar(100), RecordDate, 120) record_date, 
        convert(varchar(100), UpdateTime, 120) update_time, 
        rb.*,
        rec.ExaminingPhysician, rec.ClinicalDiagnosis, rec.CheckContent, rec.CheckDiagnosis 
        from 
        dbo.record_base rb, 
        dbo.record_endoscopy_check rec  
        where rb.ID=${caseID} and rec.ID=rb.ID;`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            if (result['recordset'].length > 0) {
                resolve(result['recordset'][0])
            } else {
                resolve(null)
            }
        });
    })
}
// 获取图片
function __getImages(caseID) {
    return new Promise((resolve, reject) => {
        var sqlStr = `select * from dbo.images_of_record where RecordID=${caseID};`;
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(result['recordset'])
        });
    })
}
// 获取视频
function __getVideos(caseID) {
    return new Promise((resolve, reject) => {
        var sqlStr = `select * from dbo.video_archive where RecordID=${caseID};`;
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(result['recordset'])
        });
    })
}
// 获取视频和图片数量
function __getImagesAndVideosCount(caseID) {
    return new Promise((resolve, reject) => {
        var sqlStr = `select (select COUNT(*) from images_of_record where RecordID = ${caseID}) imagesCount, (select COUNT(*) from video_archive where RecordID = ${caseID}) videosCount;`;
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(result['recordset'][0])
        });
    })
}
// 获取病例字典
function __getHospitalInfo(endoType) {
    return new Promise((resolve, reject) => {
        var sqlStr = ""
        if (endoType == null) {
            sqlStr = `select * from dbo.reginfo;`
        } else {
            sqlStr = `select * from dbo.reginfo where EndoType=${endoType};`
        }
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            if (result['recordset'].length > 0) {
                resolve(result['recordset'][0])
            } else {
                resolve(null)
            }
        });
    })
}
// 更新病例诊断信息
function __updateCaseHospital(ID, caseHospitalObj) {
    return new Promise((resolve, reject) => {
        var valueStr = ""
        for (key in caseHospitalObj) {
            if (caseHospitalObj[key] == null) {
                continue
            } else if (typeof caseHospitalObj[key] === 'string') {
                valueStr += `${key}='${caseHospitalObj[key]}',`
            } else {
                valueStr += `${key}=${caseHospitalObj[key]},`
            }
        }
        valueStr = valueStr.substr(0, valueStr.length - 1);
        var sqlStr = `update dbo.reginfo set ${valueStr} where ID=${ID};`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    })
}
// 更新病例报告图片选择images
function __updateCaseInfoImages(caseID, images) {
    return new Promise((resolve, reject) => {
        var sqlStr = `update dbo.record_base set images='${images}' where ID=${caseID};`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    })
}
// 更新图片选择状态
function __updateImageSelect(oldImageIDs, newImageIDs) {
    return new Promise((resolve, reject) => {
        var oldImages = []
        var newImages = []
        if (oldImageIDs !== "") {
            oldImages = oldImageIDs.split(",");
        }
        if (newImageIDs !== "") {
            newImages = newImageIDs.split(",");
        }
        var selected_false_ids = subArray(oldImages, newImages);
        var selected_true_ids = subArray(newImages, oldImages);
        var selected_false = selected_false_ids.join(",");
        var selected_true = selected_true_ids.join(",");
        var finalSqlStr = "";
        if (selected_false_ids.length > 0) {
            finalSqlStr += `update dbo.images_of_record set Selected=0 where ID in (${selected_false});`
        }
        if (selected_true_ids.length > 0) {
            finalSqlStr += `update dbo.images_of_record set Selected=1 where ID in (${selected_true});`
        }
        db.sql(finalSqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            console.log("更新图片选中状态", result)
            resolve(true)
        });
    })
}
// 查询是否已经生成报告
function __isExistsReport(caseID) {
    // 加载设备图片和视频静态文件
    var config = ini.parse(fs.readFileSync('././deviceConfig.ini', 'utf-8'));
    let caseReportDirPath = path.join(config.root.imagesPath, `${caseID}/Report`)
    console.log(caseReportDirPath)
    return new Promise((resolve, reject) => {
        fs.access(caseReportDirPath, function(err) {
            if (err) {
                if (err.code == "ENOENT") {
                    resolve(null)
                } else {
                    reject(false);//"不存在"
                }
            } else {
                // resolve(true);//"存在"
                // 查询文件夹下所有文件
                let filesArr = fs.readdirSync(caseReportDirPath)
                if (filesArr.length > 0) {
                    resolve(filesArr[0])
                } else {
                    resolve(null)
                }
            }
        })
    })
}
// 记录日志
function __logRecord(logObj) {
    return new Promise((resolve, reject) => {
        var sqlLogObj = {
            UserName: logObj.UserName,
            PatientID: logObj.PatientID,
            Operation: logObj.Operation,
            Message: logObj.Message,
            UserID: logObj.UserID,
            ClientID: logObj.ClientID,
            EndoType: logObj.EndoType,
        }
        var valueStr = ""
        for (key in sqlLogObj) {
            if (sqlLogObj[key] == null) {
                valueStr += `'',`
            } else if (typeof sqlLogObj[key] === 'string') {
                valueStr += "'" + sqlLogObj[key] + "',"
            } else {
                valueStr += sqlLogObj[key] + ","
            }
        }
        valueStr = valueStr.substr(0, valueStr.length - 1);
        var sqlStr = `insert into dbo.log(${Object.keys(sqlLogObj).join(',')}) values(${valueStr});`
        db.sql(sqlStr, function (err, result) {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        });
    });

}
// 两个数组做差集
function subArray(arr1, arr2) {
    var set1 = new Set(arr1);
    var set2 = new Set(arr2);
    var subset = [];
    for (let item of set1) {
        if (!set2.has(item)) {
            subset.push(item);
        }
    }
    return subset;
}
function generateLogObj(UserID, UserName, Operation, Message, EndoType) {
    return {
        "UserID": UserID,
        "UserName": UserName,
        "PatientID": 0,
        "Operation": Operation,
        "Message": Message,
        "ClientID": 255,
        "EndoType": EndoType
    }
}


module.exports = router;