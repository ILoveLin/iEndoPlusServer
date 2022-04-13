const repSuccess = 0;
const repError = 1;
const repSuccessMsg = '请求成功';
const repParamsErrorMsg = '参数错误';
const repNoCaseInfoErrorMsg = '无病例信息';
const repErrorMsg = '请求失败';

const responseTool = function (data, code, msg, extra = null) {
    if (extra) {
        return {
            data: data,
            code: code,
            msg: msg,
            ...extra
        }
    } else {
        return {
            data: data,
            code: code,
            msg: msg
        }
    }

}
module.exports = {
    responseTool,
    repSuccess,
    repError,
    repSuccessMsg,
    repErrorMsg,
    repNoCaseInfoErrorMsg,
    repParamsErrorMsg

}