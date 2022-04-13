const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, jsonPointers: true, nullable: true });
const validateJson = (schema, json) => {
    const result = ajv.validate(schema, json);
    return {
        result,
        errors: ajv.errors
    };
};
const caseSchema = function(type) {
    var targetCaseSchema = {
        type: "object",
        properties: {
            RecordType: {type: "string", maxLength:100}, // 记录类型
            PatientID: {type: ["integer", "string"]}, // 患者id
            Name: {type: "string", maxLength:50}, // 姓名
            Married: {type: "string", maxLength:10}, // 婚否
            Sex: {type: "string", maxLength:10}, // 性别
            Tel: {type: "string", maxLength:50}, // 电话
            Address: {type: "string", maxLength:200}, // 住址
            PatientNo: {type: "string", maxLength:20}, // 病人编号
            CardID: {type: "string", maxLength:20}, // 身份证号
            MedHistory: {type: "string", maxLength:300}, // 医疗病史
            FamilyHistory: {type: "string", maxLength:300}, // 家族病史
            Race: {type: "string", maxLength:32}, // 民族种族
            Occupatior: {type: "string", maxLength:200}, // 职业
            InsuranceID: {type: "string", maxLength:200}, // 社保卡ID
            NativePlace: {type: "string", maxLength:100}, // 籍贯
            IsInHospital: {type: ["boolean", "string"]}, // 是否还在医院住院
            LastCheckUserID: {type: ["integer", "string"]}, // 最后一个来查房的医生
            DOB: {type: "string", maxLength:50}, // 生日
            PatientAge: {type: ["integer", "string"]}, // 患者年龄
            AgeUnit: {type: "string", maxLength:10}, // 年龄单位
            CaseNo: {type: "string", maxLength:20}, // 检查号
            ReturnVisit: {type: ["boolean", "string"]}, // 初复诊
            BedID: {type: "string", maxLength:10}, // 病床号
            WardID: {type: "string", maxLength:20}, // 病区号
            CaseID: {type: "string", maxLength:20}, // 病历号
            SubmitDoctor: {type: "string", maxLength:20}, // 申请医生
            Department: {type: "string", maxLength:20}, // 科室
            Device: {type: "string", maxLength:20}, // 设备
            Fee: {type: "string", maxLength:50}, // 收费
            FeeType: {type: "string", maxLength:10}, // 收费类型
            ChiefComplaint: {type: "string", maxLength:200}, // 主诉
            Test: {type: "string", maxLength:200}, // 试验
            Advice: {type: "string", maxLength:200}, // 建议
            InpatientID: {type: "string", maxLength:20}, // 住院号
            OutpatientID: {type: "string", maxLength:20}, // 门诊号
            Others: {type: "string", maxLength:200}, // 其他
            Await1: {type: "string", maxLength:200}, // 待定1
            Await2: {type: "string", maxLength:200}, // 待定2
            Await3: {type: "string", maxLength:200}, // 待定3
            Await4: {type: "string", maxLength:200}, // 待定4
            Await5: {type: ["integer", "string"]}, // 待定5
            Biopsy: {type: "string", maxLength:200}, // 活检
            Ctology: {type: "string", maxLength:200}, // 细胞学
            Pathology: {type: "string", maxLength:200}, // 病理学
            UserName: {type: "string", maxLength:50}, // 操作用户名
            UserID: {type: ["integer", "string"]}, // 用户名ID （用于记录log）
            EndoType: {type: ["integer", "string"]}, // 工作站类型
            ExaminingPhysician: {type: "string", maxLength: 20}, // 检查医生
            ClinicalDiagnosis: {type: "string", maxLength: 300}, // 临床诊断
            CheckContent: {type: "string"}, // 检查内容（镜检所见）
            CheckDiagnosis: {type: "string", maxLength: 300}, // 镜检诊断
        },
        // required: ["Name", "CaseNo", "UserName", "EndoType"],
        required: ["Name", "UserName", "EndoType", "UserID"],
        additionalProperties: false,
    };
    if (type == 'update') {
        targetCaseSchema["properties"]["ID"] = {type: ["integer", "string"]};
        targetCaseSchema["required"] = ["ID", "CaseNo", "UserName", "EndoType", "UserID"];
    }
    return targetCaseSchema
}
const caseInfoDeleteSchema = {
    type: "object",
    properties: {
        ID: {type: ["integer", "string"]}, // 内部id
        UserName: {type: "string"}, // 操作用户名（用于记录log）
        UserID: {type: ["integer", "string"]}, // 用户名ID （用于记录log）
        EndoType: {type: ["integer", "string"]}, // 工作站类型（用于记录log）
    },
    required: ["ID", "UserID", "UserName", "EndoType"],
    additionalProperties: false,
}
const caseInfoSchema = {
    type: "object",
    properties: {
        ID: {type: ["integer", "string"]}, // 内部id
    },
    required: ["ID"],
    additionalProperties: false,
}
const caseReportSearchSchema = {
    type: "object",
    properties: {
        Name: {type: "string", maxLength:50}, // 姓名
        Sex: {type: "string", maxLength:10}, // 性别
        OutpatientID: {type: "string", maxLength:20}, // 门诊号
        CardID: {type: "string", maxLength:20}, // 身份证号
        InsuranceID: {type: "string", maxLength:200}, // 社保卡ID
    },
    require: ["Name"],
    additionalProperties: false,
}
const caseSearchSchema = {
    type: "object",
    properties: {
        CheckDateStart: {type: "string"}, // 检查时间开始
        CheckDateEnd: {type: "string"}, // 检查时间结束
        CaseNo: {type: "string", maxLength:20}, // 检查号
        ReturnVisit: {type: ["boolean", "string"]}, // 初复诊
        Name: {type: "string", maxLength:50}, // 姓名
        Sex: {type: "string", maxLength:10}, // 性别
        PatientAgeStart: {type: ["integer", "string"]}, // 患者年龄开始
        PatientAgeEnd: {type: ["integer", "string"]}, // 患者年龄结束
        AgeUnit: {type: "string", maxLength:10}, // 年龄单位
        Married: {type: "string", maxLength:10}, // 婚否
        InpatientID: {type: "string", maxLength:20}, // 住院号
        BedID: {type: "string", maxLength:10}, // 病床号
        WardID: {type: "string", maxLength:20}, // 病区号
        Department: {type: "string", maxLength:20}, // 科室
        ExaminingPhysician: {type: "string", maxLength: 20}, // 检查医生
        SubmitDoctor: {type: "string", maxLength:20}, // 申请医生
        CaseID: {type: "string", maxLength:20}, // 病历号
        InsuranceID: {type: "string", maxLength:200}, // 社保卡ID
        Occupatior: {type: "string", maxLength:200}, // 职业
        Device: {type: "string", maxLength:20}, // 设备
        CheckContent: {type: "string"}, // 检查内容（镜检所见）
        CheckDiagnosis: {type: "string", maxLength: 300}, // 镜检诊断
        Advice: {type: "string", maxLength:200}, // 建议
        EndoType: { type: "string" }, // 工作站类型
    },
    required: ["EndoType"],
    additionalProperties: false,
}
const caseHospitalSchema = {
    type: "object",
    properties: {
        ID: {type: ["integer", "string"]}, // 内部id
        szHospital: {type: "string", maxLength:50},
        szSlave: {type: "string", maxLength:50},
        szAddress: {type: "string", maxLength:50},
        szTelephone: {type: "string", maxLength:30},
        szPostCode: {type: "string", maxLength:6},
        szTitle: {type: "string", maxLength:20},
        UserName: {type: "string"}, // 操作用户名（用于记录log）
        UserID: {type: ["integer", "string"]}, // 用户名ID （用于记录log）
        EndoType: {type: ["integer", "string"]}, // 工作站类型（用于记录log）
    },
    required: ["ID", "UserID", "UserName", "EndoType"],
    additionalProperties: false,
}
const selectImagesSchema = {
    type: "object",
    properties: {
        CaseID: {type: ["integer", "string"]}, // 病例ID
        oldImageIDs: {type: "string"}, // 修改前图片ID字符串
        newImageIDs: {type: "string"}, // 修改后图片ID字符串
    },
    require: ["CaseID", "ImageIDs"],
    additionalProperties: false,
}
module.exports = {
    validateJson,
    caseSchema,
    caseInfoSchema,
    caseSearchSchema,
    caseHospitalSchema,
    caseReportSearchSchema,
    selectImagesSchema,
    caseInfoDeleteSchema
};